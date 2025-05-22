import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import megalodon, { Entity as MegalodonEntities, Response as MegalodonResponse } from 'megalodon';
import { v4 as uuidv4 } from 'uuid';

import { EncryptionService } from '../shared/services/encryption.service'; // Import EncryptionService

import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AccountsService } from './accounts.service';
import { ConnectAccountCallbackQueryDto } from './dto/connect-account-callback.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountCredentialsEntity } from './entities/account-credentials.entity';
import { AccountEntity } from './entities/account.entity';
import { MastodonAppEntity } from './entities/mastodon-app.entity';

// Mocks
jest.mock('uuid');
jest.mock('megalodon');

// Central mock for the .assign() method on wrapped entities
const mockEntityAssignFunction = jest.fn();

jest.mock('@mikro-orm/core', () => {
  const originalCore = jest.requireActual('@mikro-orm/core');
  return {
    ...originalCore,
    wrap: jest.fn().mockImplementation((entityToWrap) => ({
      ...entityToWrap, // Spread properties of the entity
      assign: (dataToAssign: unknown) => {
        // Call our central mock to track calls and arguments
        mockEntityAssignFunction(dataToAssign);
        // Perform the assignment for the test's logic flow
        return Object.assign(entityToWrap, dataToAssign);
      },
      // Mock other commonly used WrappedEntity methods if necessary for your tests
      isInitialized: () => true,
      populated: () => true,
      isManaged: () => true,
      toReference: () => entityToWrap,
      toJSON: () => ({ ...entityToWrap }),
      // Add any other methods from WrappedEntity that might be called in the code under test
    })),
  };
});

const mockEntityManager = {
  persistAndFlush: jest.fn(),
  removeAndFlush: jest.fn(),
  findOne: jest.fn(),
};

const mockAccountRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  nativeDelete: jest.fn(),
  assign: jest.fn((entity, dto) => Object.assign(entity, dto)), // Simple mock for assign
};

const mockAccountCredentialsRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  nativeDelete: jest.fn(),
  assign: jest.fn((entity, dto) => Object.assign(entity, dto)),
};

const mockMastodonAppRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  assign: jest.fn((entity, dto) => Object.assign(entity, dto)),
};

const mockUsersService = {
  // Add methods used by AccountsService if any, e.g. findById
};

const mockConfigService = {
  get: jest.fn(),
};

const mockEncryptionService = {
  encrypt: jest.fn((text) => (text ? `encrypted(${text})` : null)),
  decrypt: jest.fn((text) => (text ? text.replace('encrypted(', '').replace(')', '') : null)),
};

const mockMegalodonClient = {
  registerApp: jest.fn(),
  fetchAccessToken: jest.fn(),
  verifyAccountCredentials: jest.fn(),
};

describe('AccountsService', () => {
  let service: AccountsService;
  let entityManager: jest.Mocked<EntityManager>;
  let accountRepository: jest.Mocked<EntityRepository<AccountEntity>>;
  let accountCredentialsRepository: jest.Mocked<EntityRepository<AccountCredentialsEntity>>;
  let mastodonAppRepository: jest.Mocked<EntityRepository<MastodonAppEntity>>;

  const ownerId = new ObjectId().toHexString();
  const mockOwner = {
    id: ownerId,
    email: 'owner@example.com',
    maxAccounts: 5,
    accounts: {
      isInitialized: jest.fn().mockReturnValue(true),
      loadCount: jest.fn().mockResolvedValue(0), // Added loadCount mock
      add: jest.fn(),
      remove: jest.fn(),
      getItems: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    },
  } as unknown as UserEntity;

  const mockAccountEntity = {
    id: new ObjectId().toHexString(),
    serverURL: 'https://mastodon.social',
    name: 'Test Account',
    timezone: 'Europe/Berlin',
    utcOffset: '+02:00',
    owner: mockOwner,
    isActive: true,
    setupComplete: false,
    credentials: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as AccountEntity; // Use 'any as' to simplify mocking complex MikroORM entities

  const mockAccountCredentialsEntity = {
    id: new ObjectId().toHexString(),
    account: mockAccountEntity,
    // clientID and clientSecret are removed
    connectionToken: 'connToken',
  } as AccountCredentialsEntity;

  const mockMastodonAppEntity = {
    id: new ObjectId().toHexString(),
    serverURL: mockAccountEntity.serverURL,
    clientID: 'serverClientId',
    clientSecret: 'serverClientSecret',
    appName: 'TestApp',
    scopes: ['read:accounts'],
  } as MastodonAppEntity;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEntityAssignFunction.mockClear(); // Clear the central assign mock
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');
    (megalodon as unknown as jest.Mock).mockReturnValue(mockMegalodonClient); // Mock the default export

    // Mock configService.get to return default values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      if (key === 'MARKETING_URL') return 'https://www.analytodon.com';
      if (key === 'MASTODON_APP_NAME') return 'TestApp';
      return defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: EntityManager, useValue: mockEntityManager },
        { provide: getRepositoryToken(AccountEntity), useValue: mockAccountRepository },
        { provide: getRepositoryToken(AccountCredentialsEntity), useValue: mockAccountCredentialsRepository },
        { provide: getRepositoryToken(MastodonAppEntity), useValue: mockMastodonAppRepository },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: mockEncryptionService }, // Add EncryptionService mock
      ],
    }).compile();
    // Disable logger for tests
    module.useLogger(false);

    service = module.get<AccountsService>(AccountsService);
    entityManager = mockEntityManager as unknown as jest.Mocked<EntityManager>;
    accountRepository = module.get(getRepositoryToken(AccountEntity));
    accountCredentialsRepository = module.get(getRepositoryToken(AccountCredentialsEntity));
    mastodonAppRepository = module.get(getRepositoryToken(MastodonAppEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const baseCreateAccountDto: CreateAccountDto = {
      serverURL: 'https://mastodon.example',
      timezone: 'Europe/Berlin', // Using a timezone assumed to be valid from mockAccountEntity
      name: 'My Test Account',
    };

    it('should create an account successfully', async () => {
      const createAccountDto = { ...baseCreateAccountDto };
      // This object will be what accountRepository.create returns.
      const expectedCreatedAccount = {
        ...mockAccountEntity, // Base properties like id
        ...createAccountDto, // Properties from DTO
        utcOffset: '+01:00', // Offset for Europe/Berlin from service
        owner: mockOwner,
        isActive: true, // Default values from service logic
        setupComplete: false, // Default values from service logic
      };
      accountRepository.create.mockReturnValue(expectedCreatedAccount as AccountEntity);
      entityManager.persistAndFlush.mockResolvedValueOnce(undefined);
      (mockOwner.accounts.loadCount as jest.Mock).mockResolvedValue(0); // Ensure count is within limits

      const result = await service.create(createAccountDto, mockOwner);

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverURL: createAccountDto.serverURL,
          timezone: createAccountDto.timezone,
          name: createAccountDto.name,
          utcOffset: '+01:00', // Expected offset for Europe/Berlin
          owner: mockOwner,
          isActive: true,
          setupComplete: false,
        }),
      );
      // Assertions should use the object instance returned by the mocked create
      expect(mockOwner.accounts.add).toHaveBeenCalledWith(expectedCreatedAccount);
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith([expectedCreatedAccount, mockOwner]);
      expect(result).toEqual(expectedCreatedAccount);
    });

    it('should throw ForbiddenException if max accounts reached', async () => {
      (mockOwner.accounts.loadCount as jest.Mock).mockResolvedValue(5); // Max accounts reached
      mockOwner.maxAccounts = 5;

      await expect(service.create(baseCreateAccountDto, mockOwner)).rejects.toThrow(ForbiddenException);
    });

    it('should use hostname as default name if name not provided', async () => {
      const dtoWithoutName: CreateAccountDto = { serverURL: 'https://another.example', timezone: 'Europe/London' };
      const expectedAccount = {
        ...mockAccountEntity,
        name: 'another.example',
        serverURL: 'https://another.example',
        timezone: 'Europe/London',
        utcOffset: '+00:00', // Adjusted based on observed error for Europe/London
      };
      accountRepository.create.mockReturnValue(expectedAccount as AccountEntity);
      (mockOwner.accounts.loadCount as jest.Mock).mockResolvedValue(0);

      await service.create(dtoWithoutName, mockOwner);
      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'another.example',
          serverURL: 'https://another.example',
          utcOffset: '+00:00', // For Europe/London
        }),
      );
    });

    it('should throw BadRequestException for invalid timezone', async () => {
      const dtoInvalidTimezone: CreateAccountDto = { ...baseCreateAccountDto, timezone: 'Invalid/Timezone' };
      (mockOwner.accounts.loadCount as jest.Mock).mockResolvedValue(0);
      await expect(service.create(dtoInvalidTimezone, mockOwner)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid server URL format', async () => {
      // Use a serverURL that will cause `new URL()` to throw
      const dtoInvalidURL: CreateAccountDto = { serverURL: 'http://%&', timezone: 'Europe/Berlin', name: 'Test' };
      (mockOwner.accounts.loadCount as jest.Mock).mockResolvedValue(0);
      // Explicitly mock create for this test to avoid potential leakage,
      // though it shouldn't be called if normalizeServerURL throws.
      accountRepository.create.mockReturnValueOnce(undefined as unknown as AccountEntity);
      await expect(service.create(dtoInvalidURL, mockOwner)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of accounts for the owner', async () => {
      const mockAccounts = [mockAccountEntity, { ...mockAccountEntity, id: new ObjectId().toHexString() }];
      accountRepository.find.mockResolvedValue(mockAccounts as AccountEntity[]);
      const result = await service.findAll(mockOwner);
      expect(accountRepository.find).toHaveBeenCalledWith({ owner: mockOwner }, { orderBy: { createdAt: 'DESC' } });
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('findById', () => {
    it('should return an account if found and owned by user', async () => {
      accountRepository.findOne.mockResolvedValue(mockAccountEntity as AccountEntity);
      const result = await service.findById(mockAccountEntity.id, mockOwner);
      expect(accountRepository.findOne).toHaveBeenCalledWith({
        _id: new ObjectId(mockAccountEntity.id),
        owner: mockOwner,
      });
      expect(result).toEqual(mockAccountEntity);
    });

    it('should return null if account not found', async () => {
      accountRepository.findOne.mockResolvedValue(null);
      const result = await service.findById(new ObjectId().toHexString(), mockOwner);
      expect(result).toBeNull();
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await service.findById('invalid-id', mockOwner);
      expect(result).toBeNull();
      expect(accountRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const accountId = mockAccountEntity.id;
    // Using Europe/London, assuming it's valid with +00:00 offset after previous adjustment
    const updateAccountDto: UpdateAccountDto = { name: 'Updated Name', timezone: 'Europe/London' };

    it('should update an account successfully', async () => {
      // Ensure the mockAccountEntity starts with a different timezone to test the change
      const initialAccountState = { ...mockAccountEntity, timezone: 'Europe/Berlin', utcOffset: '+02:00' };
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue(initialAccountState as AccountEntity);
      entityManager.persistAndFlush.mockResolvedValueOnce(undefined);

      const result = await service.update(accountId, updateAccountDto, mockOwner);

      expect(findByIdSpy).toHaveBeenCalledWith(accountId, mockOwner);
      expect(mockEntityAssignFunction).toHaveBeenCalledWith(updateAccountDto);
      // initialAccountState is modified by wrap().assign()
      expect(initialAccountState.utcOffset).toBe('+00:00'); // For Europe/London
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(initialAccountState);
      expect(result.name).toBe('Updated Name');
      expect(result.timezone).toBe('Europe/London');
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.update(accountId, updateAccountDto, mockOwner)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if timezone is invalid during update', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockAccountEntity as AccountEntity);
      const invalidTimezoneDto: UpdateAccountDto = { timezone: 'Invalid/Timezone' };
      await expect(service.update(accountId, invalidTimezoneDto, mockOwner)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const accountId = mockAccountEntity.id;

    it('should remove an account successfully', async () => {
      const mockAccountWithCredentials = {
        ...mockAccountEntity,
        credentials: mockAccountCredentialsEntity as Loaded<AccountCredentialsEntity>,
      } as AccountEntity;
      jest.spyOn(service, 'findById').mockResolvedValue(mockAccountWithCredentials);
      accountCredentialsRepository.nativeDelete.mockResolvedValueOnce(0); // It might return number or void
      entityManager.removeAndFlush.mockResolvedValueOnce(undefined);
      entityManager.persistAndFlush.mockResolvedValueOnce(undefined); // For owner update

      await service.remove(accountId, mockOwner);

      expect(service.findById).toHaveBeenCalledWith(accountId, mockOwner);
      expect(accountCredentialsRepository.nativeDelete).toHaveBeenCalledWith({ account: mockAccountWithCredentials });
      expect(entityManager.removeAndFlush).toHaveBeenCalledWith(mockAccountWithCredentials);
    });

    it('should remove an account successfully even if no credentials exist', async () => {
      const mockAccountWithoutCredentials = { ...mockAccountEntity, credentials: null } as AccountEntity;
      jest.spyOn(service, 'findById').mockResolvedValue(mockAccountWithoutCredentials);
      // No call to accountCredentialsRepository.nativeDelete expected
      entityManager.removeAndFlush.mockResolvedValueOnce(undefined);

      await service.remove(accountId, mockOwner);

      expect(accountCredentialsRepository.nativeDelete).not.toHaveBeenCalled();
      expect(entityManager.removeAndFlush).toHaveBeenCalledWith(mockAccountWithoutCredentials);
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.remove(accountId, mockOwner)).rejects.toThrow(NotFoundException);
    });
  });

  describe('initiateConnection', () => {
    const accountId = mockAccountEntity.id;

    it('should initiate connection with existing MastodonApp and return redirect URL', async () => {
      const freshAccount = { ...mockAccountEntity, setupComplete: false, credentials: null } as AccountEntity;
      jest.spyOn(service, 'findById').mockResolvedValue(freshAccount);
      mastodonAppRepository.findOne.mockResolvedValue(mockMastodonAppEntity); // MastodonApp exists
      accountCredentialsRepository.create.mockReturnValue(mockAccountCredentialsEntity); // For new AccountCredentials
      entityManager.persistAndFlush.mockResolvedValue(undefined);

      const result = await service.initiateConnection(accountId, mockOwner);

      expect(service.findById).toHaveBeenCalledWith(accountId, mockOwner);
      expect(mastodonAppRepository.findOne).toHaveBeenCalledWith({ serverURL: freshAccount.serverURL });
      expect(mockMegalodonClient.registerApp).not.toHaveBeenCalled(); // Should not register new app
      expect(accountCredentialsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ account: freshAccount, connectionToken: 'mock-uuid' }),
      );
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith([mockAccountCredentialsEntity, freshAccount]);
      expect(result.redirectUrl).toContain('oauth/authorize');
      expect(result.redirectUrl).toContain(`client_id=${mockMastodonAppEntity.clientID}`);
      expect(result.redirectUrl).toContain(
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Faccounts%2Fconnect%2Fcallback',
      );
      expect(result.redirectUrl).toContain('&state=mock-uuid');
    });

    it('should register new MastodonApp if not existing and then initiate connection', async () => {
      const freshAccount = { ...mockAccountEntity, setupComplete: false, credentials: null } as AccountEntity;
      jest.spyOn(service, 'findById').mockResolvedValue(freshAccount);
      mastodonAppRepository.findOne.mockResolvedValue(null); // MastodonApp does NOT exist
      const rawClientSecret = 'new-server-client-secret';
      mockMegalodonClient.registerApp.mockResolvedValue({
        client_id: 'new-server-client-id',
        client_secret: rawClientSecret,
      });
      const encryptedClientSecret = `encrypted(${rawClientSecret})`;
      mockEncryptionService.encrypt.mockReturnValueOnce(encryptedClientSecret); // Mock encryption for client secret

      mastodonAppRepository.create.mockReturnValue({
        ...mockMastodonAppEntity,
        clientID: 'new-server-client-id',
        clientSecret: encryptedClientSecret, // Store the "encrypted" version
      });
      accountCredentialsRepository.create.mockReturnValue(mockAccountCredentialsEntity);
      entityManager.persistAndFlush.mockResolvedValue(undefined); // For MastodonApp, then for AccountCredentials

      const result = await service.initiateConnection(accountId, mockOwner);

      expect(mockMegalodonClient.registerApp).toHaveBeenCalled();
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(rawClientSecret);
      expect(mastodonAppRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverURL: freshAccount.serverURL,
          clientID: 'new-server-client-id',
          clientSecret: encryptedClientSecret, // Expect encrypted secret
        }),
      );
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith(expect.any(Object)); // For MastodonApp
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith([mockAccountCredentialsEntity, freshAccount]); // For AccountCredentials
      expect(result.redirectUrl).toContain('client_id=new-server-client-id');
      expect(result.redirectUrl).toContain(
        'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Faccounts%2Fconnect%2Fcallback',
      );
      expect(result.redirectUrl).toContain('&state=mock-uuid');
    });

    it('should update existing AccountCredentials if found during initiation', async () => {
      const existingCredentials = { ...mockAccountCredentialsEntity, accessToken: 'oldToken' };
      const accountWithExistingCreds = {
        ...mockAccountEntity,
        setupComplete: true,
        credentials: existingCredentials as Loaded<AccountCredentialsEntity>,
      } as AccountEntity;

      jest.spyOn(service, 'findById').mockResolvedValue(accountWithExistingCreds);
      mastodonAppRepository.findOne.mockResolvedValue(mockMastodonAppEntity);
      accountCredentialsRepository.findOne.mockResolvedValue(existingCredentials); // Simulate finding existing AccountCredentials
      entityManager.persistAndFlush.mockResolvedValue(undefined);

      await service.initiateConnection(accountId, mockOwner);

      expect(accountCredentialsRepository.create).not.toHaveBeenCalled();
      expect(mockEntityAssignFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionToken: 'mock-uuid',
          accessToken: undefined,
        }),
      );
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith([existingCredentials, accountWithExistingCreds]);
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.initiateConnection(accountId, mockOwner)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException if Megalodon fails to register app (when MastodonApp is new)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockAccountEntity as AccountEntity);
      mastodonAppRepository.findOne.mockResolvedValue(null); // Force app registration
      mockMegalodonClient.registerApp.mockRejectedValue(new Error('Megalodon error'));
      await expect(service.initiateConnection(accountId, mockOwner)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('handleConnectionCallback', () => {
    const callbackQueryDto: ConnectAccountCallbackQueryDto = {
      state: 'connToken', // Changed from token to state
      code: 'authCode',
    };
    const mockOwnerHint = mockOwner;

    let mockEncryptedMastodonApp: typeof mockMastodonAppEntity;
    let rawAccessToken: string;
    let encryptedAccessToken: string;

    const populatedAccountCredentials = {
      ...mockAccountCredentialsEntity,
      account: {
        ...mockAccountEntity,
        owner: mockOwner as Loaded<UserEntity>, // Ensure owner is "loaded"
      } as Loaded<AccountEntity, 'owner'>,
    };

    beforeEach(() => {
      // Ensure account.owner is correctly typed and populated for the test
      const fullyPopulatedAccount = {
        ...mockAccountEntity,
        owner: mockOwner as Loaded<UserEntity>, // UserEntity is already mocked as Loaded-like
        id: mockAccountEntity.id, // ensure id is present
      } as Loaded<AccountEntity, 'owner'>;

      populatedAccountCredentials.account = fullyPopulatedAccount;
      // Simulate MastodonAppEntity having an encrypted client secret
      mockEncryptedMastodonApp = {
        ...mockMastodonAppEntity,
        clientSecret: 'encrypted(serverClientSecret)',
      };
      rawAccessToken = 'newAccessToken';
      encryptedAccessToken = `encrypted(${rawAccessToken})`;

      accountCredentialsRepository.findOne.mockResolvedValue(
        populatedAccountCredentials as Loaded<AccountCredentialsEntity, 'account.owner'>,
      );
      // Mock that MastodonApp for the account's serverURL exists
      mastodonAppRepository.findOne.mockResolvedValue(mockEncryptedMastodonApp); // Use the one with encrypted secret

      mockEncryptionService.decrypt.mockReturnValueOnce('serverClientSecret'); // For clientSecret
      mockEncryptionService.encrypt.mockReturnValueOnce(encryptedAccessToken); // For accessToken

      mockMegalodonClient.fetchAccessToken.mockResolvedValue({
        access_token: rawAccessToken, // Megalodon returns raw token
      } as MegalodonEntities.Token);
      mockMegalodonClient.verifyAccountCredentials.mockResolvedValue({
        data: {
          display_name: 'Mastodon User',
          username: 'mastodonuser',
          url: 'https://mastodon.social/@mastodonuser',
          avatar: 'avatar.png',
        } as MegalodonEntities.Account,
      } as MegalodonResponse<MegalodonEntities.Account>);
      entityManager.persistAndFlush.mockResolvedValue(undefined);
    });

    it('should handle connection callback successfully', async () => {
      const result = await service.handleConnectionCallback(callbackQueryDto, mockOwnerHint);

      expect(accountCredentialsRepository.findOne).toHaveBeenCalledWith(
        { connectionToken: callbackQueryDto.state }, // Use state here
        { populate: ['account', 'account.owner'] },
      );
      expect(mastodonAppRepository.findOne).toHaveBeenCalledWith({
        serverURL: populatedAccountCredentials.account.serverURL,
      });
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted(serverClientSecret)');
      expect(mockMegalodonClient.fetchAccessToken).toHaveBeenCalledWith(
        mockEncryptedMastodonApp.clientID,
        'serverClientSecret', // Decrypted client secret
        callbackQueryDto.code,
        'http://localhost:3000/accounts/connect/callback', // Static redirect URI
      );
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(rawAccessToken);
      expect(mockMegalodonClient.verifyAccountCredentials).toHaveBeenCalledWith(); // Called with raw token by megalodon client
      expect(mockEntityAssignFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mastodon User',
          username: 'mastodonuser',
          accountURL: 'https://mastodon.social/@mastodonuser',
          avatarURL: 'avatar.png',
          accountName: '@mastodonuser@mastodon.social',
          setupComplete: true,
          isActive: true,
        }),
      );
      expect(populatedAccountCredentials.accessToken).toBe(encryptedAccessToken); // Encrypted access token
      expect(populatedAccountCredentials.connectionToken).toBeUndefined();
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith([
        populatedAccountCredentials.account,
        populatedAccountCredentials,
      ]);
      expect(result).toEqual({ accountId: mockAccountEntity.id, isReconnect: false }); // Assuming setupComplete was false initially
    });

    it('should unset legacy client ID and secret after successful callback', async () => {
      // Ensure legacy fields are present before the call
      populatedAccountCredentials.legacyClientID = 'oldLegacyId';
      populatedAccountCredentials.legacyClientSecret = 'oldLegacySecret';

      await service.handleConnectionCallback(callbackQueryDto, mockOwnerHint);

      expect(populatedAccountCredentials.legacyClientID).toBeUndefined();
      expect(populatedAccountCredentials.legacyClientSecret).toBeUndefined();
      expect(entityManager.persistAndFlush).toHaveBeenCalledWith([
        populatedAccountCredentials.account,
        populatedAccountCredentials,
      ]);
    });

    it('should throw NotFoundException if connection token is invalid', async () => {
      accountCredentialsRepository.findOne.mockResolvedValue(null);
      await expect(service.handleConnectionCallback(callbackQueryDto, mockOwnerHint)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if MastodonApp not found during callback', async () => {
      mastodonAppRepository.findOne.mockResolvedValue(null); // Simulate MastodonApp not found
      await expect(service.handleConnectionCallback(callbackQueryDto, mockOwnerHint)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw ForbiddenException if owner hint does not match', async () => {
      const differentOwner = { ...mockOwner, id: new ObjectId().toHexString() } as UserEntity;
      await expect(service.handleConnectionCallback(callbackQueryDto, differentOwner)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw InternalServerErrorException if Megalodon fetchAccessToken fails', async () => {
      mockMegalodonClient.fetchAccessToken.mockRejectedValue(new Error('Megalodon OAuth error'));
      await expect(service.handleConnectionCallback(callbackQueryDto, mockOwnerHint)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if Megalodon verifyAccountCredentials fails', async () => {
      mockMegalodonClient.verifyAccountCredentials.mockRejectedValue(new Error('Megalodon API error'));
      await expect(service.handleConnectionCallback(callbackQueryDto, mockOwnerHint)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // Test private helper methods indirectly or consider making them protected/static for direct testing if complex.
  // For normalizeServerURL and getUtcOffset, their behavior is tested via the public methods that use them (create, update).
});
