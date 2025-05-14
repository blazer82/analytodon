import { EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';

import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserCredentialsEntity } from './entities/user-credentials.entity';

// Mock external libraries
jest.mock('bcrypt');
jest.mock('uuid');

// Mock implementations or values
const mockUsersService = {
  save: jest.fn(),
  findByResetPasswordToken: jest.fn(),
  findByEmailVerificationCode: jest.fn(),
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

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let userRepository: EntityRepository<UserEntity>;
  let userCredentialsRepository: EntityRepository<UserCredentialsEntity>;

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
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: mockUserCredentialsRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<EntityRepository<UserEntity>>(getRepositoryToken(UserEntity));
    userCredentialsRepository = module.get<EntityRepository<UserCredentialsEntity>>(
      getRepositoryToken(UserCredentialsEntity),
    );
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

    beforeEach(() => {
      mockUser = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.AccountOwner,
        oldAccountDeletionNoticeSent: false,
        credentials: { id: 'cred1', refreshToken: null } as UserCredentialsEntity,
      } as UserEntity;
      mockJwtService.sign.mockReturnValue('accessToken');
      (uuidv4 as jest.Mock).mockReturnValue('newRefreshToken');
    });

    it('should return access and refresh tokens', async () => {
      const result = await service.login(mockUser);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'newRefreshToken' }),
      );
      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'newRefreshToken',
      });
    });

    it('should update oldAccountDeletionNoticeSent if true', async () => {
      mockUser.oldAccountDeletionNoticeSent = true;
      await service.login(mockUser);
      expect(mockUsersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ oldAccountDeletionNoticeSent: false }),
      );
    });

    it('should throw UnauthorizedException if credentials not loaded', async () => {
      mockUser.credentials = undefined;
      await expect(service.login(mockUser)).rejects.toThrow(UnauthorizedException);
    });
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
      (uuidv4 as jest.Mock).mockImplementation(() => {
        // First call for emailVerificationCode, second for refreshToken
        if ((uuidv4 as jest.Mock).mock.calls.length <= 1) return 'mocked-uuid-email-verification';
        return 'mocked-uuid-refresh-token';
      });
      // Ensure the created user has credentials for the login call
      mockCreatedUser.credentials = mockCreatedCredentials;
    });

    it('should register a new user and return tokens', async () => {
      const result = await service.registerUser(registerUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ email: registerUserDto.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerUserDto.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerUserDto.email,
          role: UserRole.AccountOwner,
          emailVerificationCode: 'mocked-uuid-email-verification',
        }),
      );
      expect(mockUserCredentialsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashedPassword' }),
      );
      expect(mockUserRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(mockCreatedUser);
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        expect.objectContaining({ user: mockCreatedUser }),
      );
      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'mocked-uuid-refresh-token',
      });
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
    const refreshToken = 'validRefreshToken';
    let mockUserCredentials: UserCredentialsEntity;
    let mockUser: UserEntity;

    beforeEach(() => {
      mockUser = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.AccountOwner,
        isActive: true,
        oldAccountDeletionNoticeSent: false,
      } as UserEntity;
      mockUserCredentials = {
        id: 'cred1',
        refreshToken,
        user: mockUser,
      } as UserCredentialsEntity;

      mockUserCredentialsRepository.findOne.mockResolvedValue(mockUserCredentials);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('newAccessToken');
      (uuidv4 as jest.Mock).mockReturnValue('newRefreshTokenUuid');
    });

    it('should return new access and refresh tokens', async () => {
      const result = await service.refreshTokens(refreshToken);
      expect(mockUserCredentialsRepository.findOne).toHaveBeenCalledWith({ refreshToken }, { populate: ['user'] });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        id: mockUser.id,
        isActive: true,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'newRefreshTokenUuid' }),
      );
      expect(result).toEqual({
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshTokenUuid',
      });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockUserCredentialsRepository.findOne.mockResolvedValue(null);
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found or inactive', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should update oldAccountDeletionNoticeSent if true', async () => {
      mockUser.oldAccountDeletionNoticeSent = true;
      mockUserRepository.findOne.mockResolvedValue(mockUser); // ensure this user is returned
      await service.refreshTokens(refreshToken);
      expect(mockUsersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ oldAccountDeletionNoticeSent: false }),
      );
    });
  });

  describe('logout', () => {
    const userId = new ObjectId().toHexString();
    let mockUserCredentials: UserCredentialsEntity;

    beforeEach(() => {
      mockUserCredentials = {
        id: 'cred1',
        refreshToken: 'someToken',
        user: { id: userId } as UserEntity,
      } as UserCredentialsEntity;
    });

    it('should clear refresh token for valid user ID', async () => {
      mockUserCredentialsRepository.findOne.mockResolvedValue(mockUserCredentials);
      await service.logout(userId);
      expect(mockUserCredentialsRepository.findOne).toHaveBeenCalledWith({ user: new ObjectId(userId) });
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: undefined }),
      );
    });

    it('should do nothing if user credentials not found', async () => {
      mockUserCredentialsRepository.findOne.mockResolvedValue(null);
      await service.logout(userId);
      expect(mockUserCredentialsRepository.getEntityManager().persistAndFlush).not.toHaveBeenCalled();
    });

    it('should do nothing for invalid user ID string', async () => {
      await service.logout('invalid-id');
      expect(mockUserCredentialsRepository.findOne).not.toHaveBeenCalled();
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
      // TODO: Test email sending when MailService is integrated
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
