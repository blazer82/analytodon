import { UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';

import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ManageSubscriptionDto } from './dto/subscription-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// Mock bcrypt
jest.mock('bcrypt');

// Mock ObjectId.isValid for specific tests
const mockObjectIdIsValid = jest.spyOn(ObjectId, 'isValid');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<EntityRepository<UserEntity>>;
  let userCredentialsRepository: jest.Mocked<EntityRepository<UserCredentialsEntity>>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  // Logger spy
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    mockObjectIdIsValid.mockReturnValue(true); // Default to valid ObjectId

    // Mock EntityManager methods
    mockEntityManager = {
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      // Add other EntityManager methods if they are used directly or indirectly and need mocking
    } as unknown as jest.Mocked<EntityManager>;

    // Mock Repository methods
    const mockUserRepositoryMethods = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      assign: jest.fn((entity, dto) => Object.assign(entity, dto)),
      getEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    };

    const mockUserCredentialsRepositoryMethods = {
      findOne: jest.fn(),
      create: jest.fn(),
      assign: jest.fn(),
      getEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    };

    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

    // Mock MailService methods
    const mockMailServiceMethods = {
      sendGenericPlainTextEmail: jest.fn().mockResolvedValue(undefined),
      // Add other MailService methods used by UsersService if any, and mock their return values
      // For example, if UsersService calls other mail methods directly:
      // sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      // sendEmailVerificationMail: jest.fn().mockResolvedValue(undefined),
      // Accessing private member supportEmail for testing sendEmailToUsers
      supportEmail: 'admin@example.com',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepositoryMethods,
        },
        {
          provide: getRepositoryToken(UserCredentialsEntity),
          useValue: mockUserCredentialsRepositoryMethods,
        },
        {
          provide: MailService,
          useValue: mockMailServiceMethods,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    userCredentialsRepository = module.get(getRepositoryToken(UserCredentialsEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.AccountOwner,
    };
    let mockUser: UserEntity;
    let mockUserCredentials: UserCredentialsEntity;

    beforeEach(() => {
      mockUser = {
        id: new ObjectId().toHexString(),
        email: createUserDto.email,
        role: createUserDto.role,
        isActive: true,
        emailVerified: false,
        // ... other properties
      } as UserEntity;

      mockUserCredentials = {
        id: new ObjectId().toHexString(),
        passwordHash: 'hashedPassword',
        user: mockUser,
      } as UserCredentialsEntity;

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userCredentialsRepository.create.mockReturnValue(mockUserCredentials);
      mockEntityManager.persistAndFlush.mockImplementation(async (entities) => {
        if (Array.isArray(entities)) {
          const userEntity = entities.find((e) => e === mockUser) as UserEntity;
          if (userEntity) {
            userEntity.credentials = mockUserCredentials;
          }
        } else if (entities === mockUser) {
          (entities as UserEntity).credentials = mockUserCredentials;
        }
        return Promise.resolve();
      });
    });

    it('should create a new user and credentials successfully', async () => {
      const result = await service.create(createUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ email: createUserDto.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          role: createUserDto.role,
          isActive: true,
          emailVerified: false,
        }),
      );
      expect(userCredentialsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashedPassword',
          user: mockUser,
        }),
      );
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith([mockUser, mockUserCredentials]);
      expect(result).toBe(mockUser);
      expect(result.credentials).toBe(mockUserCredentials);
      expect(loggerLogSpy).toHaveBeenCalledWith(`Admin created user: ${mockUser.email}`);
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue({} as UserEntity);
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on database unique constraint error during persist', async () => {
      const dbError = { code: 11000, message: 'duplicate key error', stack: 'mock stack' };
      mockEntityManager.persistAndFlush.mockRejectedValueOnce(dbError);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during admin user creation: duplicate key error'),
        'mock stack',
      );
    });

    it('should rethrow other database errors during persist', async () => {
      const genericError = new Error('Generic DB Error');
      genericError.stack = 'mock generic stack';
      mockEntityManager.persistAndFlush.mockRejectedValueOnce(genericError);

      await expect(service.create(createUserDto)).rejects.toThrow(genericError);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during admin user creation: Generic DB Error'),
        'mock generic stack',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [{ id: '1' }, { id: '2' }] as UserEntity[];
      userRepository.findAll.mockResolvedValue(mockUsers);
      const result = await service.findAll();
      expect(result).toEqual(mockUsers);
      expect(userRepository.findAll).toHaveBeenCalledWith({ populate: ['accounts'], orderBy: { createdAt: 'DESC' } });
    });
  });

  describe('findById', () => {
    const userId = new ObjectId().toHexString();
    const mockUser = { id: userId, email: 'test@example.com' } as UserEntity;

    it('should return a user if found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findById(userId);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        { _id: new ObjectId(userId) },
        { populate: ['credentials', 'accounts'] },
      );
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.findById(userId);
      expect(result).toBeNull();
    });

    it('should return null if ID is invalid', async () => {
      mockObjectIdIsValid.mockReturnValueOnce(false);
      const result = await service.findById('invalid-id');
      expect(result).toBeNull();
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    const email = 'test@example.com';
    const mockUser = { id: '1', email } as UserEntity;

    it('should return a user if found by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail(email);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ email });
    });

    it('should return null if user not found by email', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.findByEmail(email);
      expect(result).toBeNull();
    });
  });

  describe('findByEmailVerificationCode', () => {
    const code = 'verification-code';
    const mockUser = { id: '1', emailVerificationCode: code } as UserEntity;

    it('should return a user if found by code and active', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmailVerificationCode(code);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ emailVerificationCode: code, isActive: true });
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.findByEmailVerificationCode(code);
      expect(result).toBeNull();
    });
  });

  describe('findByResetPasswordToken', () => {
    const token = 'reset-token';
    const mockUser = { id: '1', resetPasswordToken: token } as UserEntity;

    it('should return a user if found by token and active', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByResetPasswordToken(token);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        { resetPasswordToken: token, isActive: true },
        { populate: ['credentials'] },
      );
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.findByResetPasswordToken(token);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const userId = new ObjectId().toHexString();
    const updateUserDto: UpdateUserDto = { email: 'updated@example.com', isActive: false };
    let mockUser: UserEntity;

    beforeEach(() => {
      mockUser = {
        id: userId,
        email: 'original@example.com',
        isActive: true,
        credentials: { id: 'cred1', passwordHash: 'oldHash' } as Loaded<UserCredentialsEntity, never>,
      } as UserEntity;
      // Mock findById to return this user
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser);
    });

    it('should update user properties successfully', async () => {
      const result = await service.update(userId, updateUserDto);
      expect(service.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.assign).toHaveBeenCalledWith(mockUser, updateUserDto);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(result.email).toBe('updated@example.com');
      expect(loggerLogSpy).toHaveBeenCalledWith(`User ${mockUser.email} (ID: ${userId}) updated by admin.`);
    });

    it('should update password if provided and credentials exist', async () => {
      const dtoWithPassword: UpdateUserDto = { ...updateUserDto, password: 'newPassword123' };
      await service.update(userId, dtoWithPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect((mockUser.credentials as UserCredentialsEntity).passwordHash).toBe('hashedPassword');
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser.credentials);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should create credentials and update password if password provided and credentials do not exist', async () => {
      mockUser.credentials = undefined;
      const dtoWithPassword: UpdateUserDto = { password: 'newPassword123' };
      const newCredentials = { passwordHash: 'hashedPassword', user: mockUser } as UserCredentialsEntity;
      userCredentialsRepository.create.mockReturnValue(newCredentials);

      await service.update(userId, dtoWithPassword);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `User ${mockUser.email} (ID: ${userId}) has no credentials. Creating new ones for password update.`,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(userCredentialsRepository.create).toHaveBeenCalledWith({ passwordHash: 'hashedPassword', user: mockUser });
      expect(mockUser.credentials).toBe(newCredentials);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(newCredentials);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.update(userId, updateUserDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('manageSubscription', () => {
    const userId = new ObjectId().toHexString();
    const email = 'user@example.com';
    const manageSubscriptionDto: ManageSubscriptionDto = { u: userId, e: email };
    const type = 'news';
    let mockUser: UserEntity;

    beforeEach(() => {
      mockUser = {
        id: userId,
        email,
        unsubscribed: [],
      } as UserEntity;
      userRepository.findOne.mockResolvedValue(mockUser);
    });

    it('should subscribe user by removing type from unsubscribed list', async () => {
      mockUser.unsubscribed = [type, 'other'];
      await service.manageSubscription(manageSubscriptionDto, type, true);
      expect(userRepository.findOne).toHaveBeenCalledWith({ _id: new ObjectId(userId), email });
      expect(mockUser.unsubscribed).toEqual(['other']);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `User ${email} subscription status for '${type}' updated to subscribed.`,
      );
    });

    it('should unsubscribe user by adding type to unsubscribed list', async () => {
      mockUser.unsubscribed = ['other'];
      await service.manageSubscription(manageSubscriptionDto, type, false);
      expect(mockUser.unsubscribed).toEqual(['other', type]);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `User ${email} subscription status for '${type}' updated to unsubscribed.`,
      );
    });

    it('should not add type if already unsubscribed', async () => {
      mockUser.unsubscribed = [type];
      await service.manageSubscription(manageSubscriptionDto, type, false);
      expect(mockUser.unsubscribed).toEqual([type]);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should handle user with no initial unsubscribed list (subscribe)', async () => {
      mockUser.unsubscribed = undefined;
      await service.manageSubscription(manageSubscriptionDto, type, true); // Subscribing means it should remain empty or not contain 'type'
      expect(mockUser.unsubscribed).toEqual([]); // It becomes an empty array if it was undefined
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should handle user with no initial unsubscribed list (unsubscribe)', async () => {
      mockUser.unsubscribed = undefined;
      await service.manageSubscription(manageSubscriptionDto, type, false);
      expect(mockUser.unsubscribed).toEqual([type]);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should do nothing and log warning if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await service.manageSubscription(manageSubscriptionDto, type, true);
      expect(mockEntityManager.persistAndFlush).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Subscription management: User not found or email mismatch for ID ${userId} and email ${email}.`,
      );
    });
  });

  describe('save', () => {
    it('should persist and flush the user', async () => {
      const mockUser = { id: '1' } as UserEntity;
      const result = await service.save(mockUser);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
      expect(result).toBe(mockUser);
    });
  });
});
