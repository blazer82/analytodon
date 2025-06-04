import { RefreshTokenEntity, UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm'; // Added RefreshTokenEntity
import { EntityManager } from '@mikro-orm/mongodb'; // Added EntityManager
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Added ConfigService
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';

import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// Mock external libraries
jest.mock('bcrypt');
jest.mock('uuid');

// Mock implementations or values
const mockUsersService = {
  save: jest.fn(),
  findByResetPasswordToken: jest.fn(),
  findByEmailVerificationCode: jest.fn(),
};

const mockMailService = {
  sendEmailVerificationMail: jest.fn(),
  sendSignupNotificationMail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockUserRepositoryEntityManager = {
  persistAndFlush: jest.fn(),
};
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  getEntityManager: jest.fn().mockReturnValue(mockUserRepositoryEntityManager),
};

const mockUserCredentialsRepositoryEntityManager = {
  persistAndFlush: jest.fn(),
};
const mockUserCredentialsRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  getEntityManager: jest.fn().mockReturnValue(mockUserCredentialsRepositoryEntityManager),
};

const mockRefreshTokenRepositoryEntityManager = {
  persistAndFlush: jest.fn(),
  removeAndFlush: jest.fn(),
};
const mockRefreshTokenRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  getEntityManager: jest.fn().mockReturnValue(mockRefreshTokenRepositoryEntityManager),
  nativeDelete: jest.fn(), // For logout or cleanup
};

const mockEntityManager = {
  remove: jest.fn(),
  flush: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    if (key === 'JWT_REFRESH_TOKEN_EXPIRES_IN') {
      return '7d'; // Default mock value
    }
    return defaultValue;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    (uuidv4 as jest.Mock).mockReturnValue('mocked-uuid');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EntityManager, useValue: mockEntityManager },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: mockUserCredentialsRepository,
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity), // Added RefreshTokenRepository
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const pass = 'password';
    let mockUser: UserEntity;

    beforeEach(() => {
      mockUser = {
        id: '1',
        email,
        isActive: true,
        credentials: { passwordHash: 'hashedPassword' } as UserCredentialsEntity,
      } as UserEntity;
    });

    it('should return user if credentials are valid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser(email, pass);
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ email, isActive: true }, { populate: ['credentials'] });
      expect(bcrypt.compare).toHaveBeenCalledWith(pass, 'hashedPassword');
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const result = await service.validateUser(email, pass);
      expect(result).toBeNull();
    });

    it('should return null if user has no credentials', async () => {
      mockUser.credentials = undefined;
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.validateUser(email, pass);
      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser(email, pass);
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    let mockUser: UserEntity;
    let mockRefreshToken: RefreshTokenEntity;

    beforeEach(() => {
      mockUser = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.AccountOwner,
        oldAccountDeletionNoticeSent: false,
        // credentials are not directly used by login for token generation anymore
      } as UserEntity;
      mockJwtService.sign.mockReturnValue('accessToken');
      (uuidv4 as jest.Mock).mockReturnValue('newRefreshTokenString'); // This will be the token string

      mockRefreshToken = {
        token: 'newRefreshTokenString',
        user: mockUser,
        expiresAt: expect.any(Date), // We'll check this more specifically
      } as RefreshTokenEntity;
      mockRefreshTokenRepository.create.mockReturnValue(mockRefreshToken);
    });

    it('should return access and refresh tokens and save refresh token', async () => {
      const result = await service.login(mockUser);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_REFRESH_TOKEN_EXPIRES_IN', '7d');
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'newRefreshTokenString',
          user: mockUser,
          // expiresAt will be set based on config
        }),
      );
      expect(mockRefreshTokenRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(mockRefreshToken);
      expect(result.token).toBe('accessToken');
      expect(result.refreshToken).toBe('newRefreshTokenString');
      expect(result.user).toBe(mockUser);

      // Check expiresAt logic (assuming 7d default from mockConfigService)
      const createdToken = mockRefreshTokenRepository.create.mock.calls[0][0] as RefreshTokenEntity;
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);
      expect(createdToken.expiresAt.toDateString()).toBe(expectedExpiry.toDateString());
    });

    it('should update oldAccountDeletionNoticeSent if true', async () => {
      mockUser.oldAccountDeletionNoticeSent = true;
      await service.login(mockUser);
      expect(mockUsersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ oldAccountDeletionNoticeSent: false }),
      );
    });

    // No longer relevant as credentials are not directly checked in login for refresh token
    // it('should throw UnauthorizedException if credentials not loaded', async () => {
    //   mockUser.credentials = undefined;
    //   await expect(service.login(mockUser)).rejects.toThrow(UnauthorizedException);
    // });
  });

  describe('registerUser', () => {
    const registerUserDto: RegisterUserDto = {
      email: 'new@example.com',
      password: 'password123',
      serverURLOnSignUp: 'server.com',
      timezone: 'UTC',
    };
    let mockCreatedUser: UserEntity;
    let mockCreatedCredentials: UserCredentialsEntity;

    beforeEach(() => {
      mockCreatedUser = {
        id: 'newUser1',
        email: registerUserDto.email,
        role: UserRole.AccountOwner,
        isActive: true,
        emailVerified: false,
        emailVerificationCode: 'mocked-uuid',
        maxAccounts: 10,
        serverURLOnSignUp: registerUserDto.serverURLOnSignUp,
        timezone: registerUserDto.timezone,
      } as UserEntity;

      mockCreatedCredentials = {
        passwordHash: 'hashedPassword',
        user: mockCreatedUser,
      } as UserCredentialsEntity;

      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockReturnValue(mockCreatedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserCredentialsRepository.create.mockReturnValue(mockCreatedCredentials);

      // Mock the login part of registerUser
      mockJwtService.sign.mockReturnValue('accessToken');
      (uuidv4 as jest.Mock).mockReturnValue('mocked-uuid'); // For emailVerificationCode and refreshTokenString

      // Mock for the login part within registerUser
      const mockLoginRefreshToken = {
        token: 'mocked-uuid', // as uuidv4 is mocked to return this
        user: mockCreatedUser,
        expiresAt: expect.any(Date),
      } as RefreshTokenEntity;
      mockRefreshTokenRepository.create.mockReturnValue(mockLoginRefreshToken);
    });

    it('should register a new user and return tokens', async () => {
      const result = await service.registerUser(registerUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ email: registerUserDto.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerUserDto.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerUserDto.email,
          role: UserRole.AccountOwner,
          emailVerificationCode: 'mocked-uuid',
        }),
      );
      expect(mockUserCredentialsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashedPassword' }),
      );
      expect(mockUserRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(mockCreatedUser);
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        expect.objectContaining({ user: mockCreatedUser }),
      );

      // Verify email sending
      // user.emailVerificationCode comes from mockCreatedUser.emailVerificationCode, which is 'mocked-uuid'
      // because userRepository.create is mocked and doesn't execute uuidv4() for emailVerificationCode.
      expect(mockMailService.sendEmailVerificationMail).toHaveBeenCalledWith(mockCreatedUser, 'mocked-uuid');
      expect(mockMailService.sendSignupNotificationMail).toHaveBeenCalledWith(mockCreatedUser);

      // login() part
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({ token: 'mocked-uuid' }));
      expect(mockRefreshTokenRepository.getEntityManager().persistAndFlush).toHaveBeenCalled();

      expect(result.token).toBe('accessToken');
      expect(result.refreshToken).toBe('mocked-uuid'); // This comes from the login call within registerUser
      expect(result.user).toBe(mockCreatedUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({} as UserEntity); // User exists
      await expect(service.registerUser(registerUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on database unique constraint error', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.getEntityManager().persistAndFlush.mockRejectedValueOnce({ code: 11000 }); // Simulate DB error
      await expect(service.registerUser(registerUserDto)).rejects.toThrow(ConflictException);
    });

    it('should rethrow other database errors', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const genericError = new Error('Generic DB Error');
      mockUserRepository.getEntityManager().persistAndFlush.mockRejectedValueOnce(genericError);
      await expect(service.registerUser(registerUserDto)).rejects.toThrow(genericError);
    });
  });

  describe('refreshTokens', () => {
    const oldRefreshTokenString = 'validOldRefreshToken';
    let mockOldRefreshTokenEntity: RefreshTokenEntity;
    let mockUser: UserEntity;
    let mockNewRefreshTokenEntity: RefreshTokenEntity;

    beforeEach(() => {
      mockUser = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.AccountOwner,
        isActive: true,
        oldAccountDeletionNoticeSent: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accounts: { isInitialized: () => true, getItems: () => [] } as any, // Mock accounts collection
      } as UserEntity;

      mockOldRefreshTokenEntity = {
        id: 'rt1',
        token: oldRefreshTokenString,
        user: mockUser,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // Expires tomorrow
      } as RefreshTokenEntity;

      mockNewRefreshTokenEntity = {
        id: 'rt2',
        token: 'newRefreshTokenUuid',
        user: mockUser,
        expiresAt: expect.any(Date),
      } as RefreshTokenEntity;

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockOldRefreshTokenEntity);
      mockJwtService.sign.mockReturnValue('newAccessToken');
      (uuidv4 as jest.Mock).mockReturnValue('newRefreshTokenUuid');
      mockRefreshTokenRepository.create.mockReturnValue(mockNewRefreshTokenEntity);
    });

    it('should return new access and refresh tokens, remove old, save new', async () => {
      const result = await service.refreshTokens(oldRefreshTokenString);

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith(
        { token: oldRefreshTokenString },
        { populate: ['user', 'user.accounts'] },
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockRefreshTokenRepository.getEntityManager().removeAndFlush).toHaveBeenCalledWith(
        mockOldRefreshTokenEntity,
      );
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'newRefreshTokenUuid', user: mockUser }),
      );
      expect(mockRefreshTokenRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        mockNewRefreshTokenEntity,
      );

      expect(result.token).toBe('newAccessToken');
      expect(result.refreshToken).toBe('newRefreshTokenUuid');
      expect(result.user).toBe(mockUser);
    });

    it('should throw UnauthorizedException if token is not found', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);
      await expect(service.refreshTokens(oldRefreshTokenString)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token.'),
      );
    });

    it('should throw UnauthorizedException if token is expired and remove it', async () => {
      mockOldRefreshTokenEntity.expiresAt = new Date(Date.now() - 10000); // Expired
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockOldRefreshTokenEntity);
      await expect(service.refreshTokens(oldRefreshTokenString)).rejects.toThrow(
        new UnauthorizedException('Refresh token expired.'),
      );
      expect(mockRefreshTokenRepository.getEntityManager().removeAndFlush).toHaveBeenCalledWith(
        mockOldRefreshTokenEntity,
      );
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      mockUser.isActive = false;
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockOldRefreshTokenEntity);
      await expect(service.refreshTokens(oldRefreshTokenString)).rejects.toThrow(
        new UnauthorizedException('User not active.'),
      );
    });

    it('should update oldAccountDeletionNoticeSent if true', async () => {
      mockUser.oldAccountDeletionNoticeSent = true;
      await service.refreshTokens(oldRefreshTokenString);
      expect(mockUsersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ oldAccountDeletionNoticeSent: false }),
      );
    });
  });

  describe('logout', () => {
    const userId = new ObjectId().toHexString();
    let mockUserWithTokens: UserEntity;
    let mockToken1: RefreshTokenEntity;
    let mockToken2: RefreshTokenEntity;

    beforeEach(() => {
      mockToken1 = { id: 't1', token: 'token1' } as RefreshTokenEntity;
      mockToken2 = { id: 't2', token: 'token2' } as RefreshTokenEntity;
      mockUserWithTokens = {
        id: userId,
        refreshTokens: {
          isInitialized: jest.fn().mockReturnValue(true),
          getItems: jest.fn().mockReturnValue([mockToken1, mockToken2]),
          init: jest.fn().mockResolvedValue(undefined), // For the else if branch
        },
      } as unknown as UserEntity;
    });

    it('should remove all refresh tokens for a valid user ID if tokens are initialized', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUserWithTokens);
      await service.logout(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(userId, { populate: ['refreshTokens'] });
      expect(mockUserWithTokens.refreshTokens.getItems).toHaveBeenCalled();
      expect(mockEntityManager.remove).toHaveBeenCalledWith(mockToken1);
      expect(mockEntityManager.remove).toHaveBeenCalledWith(mockToken2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should initialize and remove tokens if not initialized', async () => {
      (mockUserWithTokens.refreshTokens.isInitialized as jest.Mock).mockReturnValue(false);
      mockUserRepository.findOne.mockResolvedValue(mockUserWithTokens);

      await service.logout(userId);

      expect(mockUserWithTokens.refreshTokens.init).toHaveBeenCalled();
      expect(mockUserWithTokens.refreshTokens.getItems).toHaveBeenCalled();
      expect(mockEntityManager.remove).toHaveBeenCalledWith(mockToken1);
      expect(mockEntityManager.remove).toHaveBeenCalledWith(mockToken2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should do nothing if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await service.logout(userId);
      expect(mockEntityManager.remove).not.toHaveBeenCalled();
      expect(mockEntityManager.flush).not.toHaveBeenCalled();
    });

    it('should do nothing for invalid user ID string', async () => {
      await service.logout('invalid-id');
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const requestDto: RequestPasswordResetDto = { email: 'user@example.com' };
    let mockUser: UserEntity;

    beforeEach(() => {
      mockUser = {
        id: '1',
        email: requestDto.email,
        isActive: true,
        emailVerified: true,
        resetPasswordToken: null,
      } as UserEntity;
      (uuidv4 as jest.Mock).mockReturnValue('reset-token');
    });

    it('should set resetPasswordToken and save user if user found and active/verified', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      await service.requestPasswordReset(requestDto);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        email: requestDto.email,
        isActive: true,
        emailVerified: true,
      });
      expect(mockUsersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ resetPasswordToken: 'reset-token' }),
      );
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(mockUser, 'reset-token');
    });

    it('should do nothing if user not found or not active/verified', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await service.requestPasswordReset(requestDto);
      expect(mockUsersService.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetDto: ResetPasswordDto = { token: 'valid-token', password: 'newPassword123' };
    let mockUser: UserEntity;
    let mockUserCredentials: UserCredentialsEntity;

    beforeEach(() => {
      mockUserCredentials = { id: 'cred1', passwordHash: 'oldHash' } as UserCredentialsEntity;
      mockUser = {
        id: '1',
        email: 'user@example.com',
        resetPasswordToken: resetDto.token,
        credentials: mockUserCredentials,
      } as UserEntity;
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
    });

    it('should reset password, clear token, and save user/credentials', async () => {
      mockUsersService.findByResetPasswordToken.mockResolvedValue(mockUser);
      await service.resetPassword(resetDto);

      expect(mockUsersService.findByResetPasswordToken).toHaveBeenCalledWith(resetDto.token);
      expect(bcrypt.hash).toHaveBeenCalledWith(resetDto.password, 10);
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'newHashedPassword' }),
      );
      expect(mockUsersService.save).toHaveBeenCalledWith(expect.objectContaining({ resetPasswordToken: undefined }));
    });

    it('should throw NotFoundException if token is invalid or expired', async () => {
      mockUsersService.findByResetPasswordToken.mockResolvedValue(null);
      await expect(service.resetPassword(resetDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user has no credentials', async () => {
      mockUser.credentials = undefined;
      mockUsersService.findByResetPasswordToken.mockResolvedValue(mockUser);
      await expect(service.resetPassword(resetDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyEmail', () => {
    const verificationCode = 'valid-code';
    let mockUser: UserEntity;

    beforeEach(() => {
      mockUser = {
        id: '1',
        email: 'user@example.com',
        emailVerified: false,
        emailVerificationCode: verificationCode,
      } as UserEntity;
    });

    it('should verify email, clear code, and save user', async () => {
      mockUsersService.findByEmailVerificationCode.mockResolvedValue(mockUser);
      await service.verifyEmail(verificationCode);

      expect(mockUsersService.findByEmailVerificationCode).toHaveBeenCalledWith(verificationCode);
      expect(mockUsersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true, emailVerificationCode: undefined }),
      );
    });

    it('should throw NotFoundException if verification code is invalid or expired', async () => {
      mockUsersService.findByEmailVerificationCode.mockResolvedValue(null);
      await expect(service.verifyEmail(verificationCode)).rejects.toThrow(NotFoundException);
    });
  });
});
