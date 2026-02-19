import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { EntityManager } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';

import { AdminAccountsService } from './admin-accounts.service';

describe('AdminAccountsService', () => {
  let service: AdminAccountsService;
  let accountRepository: jest.Mocked<EntityRepository<AccountEntity>>;
  let userRepository: jest.Mocked<EntityRepository<UserEntity>>;

  const mockOwner = {
    id: new ObjectId().toHexString(),
    _id: new ObjectId(),
    email: 'owner@example.com',
  } as unknown as UserEntity;

  const mockAccount = {
    id: new ObjectId().toHexString(),
    _id: new ObjectId(),
    serverURL: 'https://mastodon.social',
    accountName: '@user@mastodon.social',
    username: 'user',
    name: 'Test User',
    avatarURL: 'https://mastodon.social/avatar.png',
    isActive: true,
    setupComplete: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    owner: mockOwner,
  } as unknown as AccountEntity;

  const mockAccount2 = {
    id: new ObjectId().toHexString(),
    _id: new ObjectId(),
    serverURL: 'https://mastodon.online',
    accountName: '@other@mastodon.online',
    username: 'other',
    name: 'Other User',
    avatarURL: null,
    isActive: false,
    setupComplete: false,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    owner: mockOwner,
  } as unknown as AccountEntity;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAccountsService,
        { provide: EntityManager, useValue: {} },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    service = module.get<AdminAccountsService>(AdminAccountsService);
    accountRepository = module.get(getRepositoryToken(AccountEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccounts', () => {
    it('should return paginated accounts with no filters', async () => {
      accountRepository.findAndCount.mockResolvedValue([[mockAccount, mockAccount2], 2]);

      const result = await service.getAccounts({ page: 1, limit: 25 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(25);
      expect(result.totalPages).toBe(1);
      expect(accountRepository.findAndCount).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ populate: ['owner'], orderBy: { createdAt: 'DESC' }, offset: 0, limit: 25 }),
      );
    });

    it('should filter by isActive', async () => {
      accountRepository.findAndCount.mockResolvedValue([[mockAccount], 1]);

      await service.getAccounts({ isActive: true, page: 1, limit: 25 });

      expect(accountRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
        expect.anything(),
      );
    });

    it('should filter by setupComplete', async () => {
      accountRepository.findAndCount.mockResolvedValue([[mockAccount], 1]);

      await service.getAccounts({ setupComplete: true, page: 1, limit: 25 });

      expect(accountRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ setupComplete: true }),
        expect.anything(),
      );
    });

    it('should search across account fields and owner email', async () => {
      userRepository.find.mockResolvedValue([mockOwner]);
      accountRepository.findAndCount.mockResolvedValue([[mockAccount], 1]);

      await service.getAccounts({ search: 'mastodon', page: 1, limit: 25 });

      expect(userRepository.find).toHaveBeenCalledWith(expect.objectContaining({ email: expect.any(RegExp) }), {
        fields: ['_id'],
      });
      expect(accountRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ $and: expect.any(Array) }),
        expect.anything(),
      );
    });

    it('should calculate pagination correctly', async () => {
      accountRepository.findAndCount.mockResolvedValue([[], 50]);

      const result = await service.getAccounts({ page: 2, limit: 25 });

      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(2);
      expect(accountRepository.findAndCount).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ offset: 25, limit: 25 }),
      );
    });

    it('should map account entities to DTOs correctly', async () => {
      accountRepository.findAndCount.mockResolvedValue([[mockAccount], 1]);

      const result = await service.getAccounts({ page: 1, limit: 25 });

      const item = result.items[0];
      expect(item.id).toBe(mockAccount.id);
      expect(item.serverURL).toBe('https://mastodon.social');
      expect(item.accountName).toBe('@user@mastodon.social');
      expect(item.isActive).toBe(true);
      expect(item.setupComplete).toBe(true);
      expect(item.owner.id).toBe(mockOwner.id);
      expect(item.owner.email).toBe('owner@example.com');
    });
  });

  describe('getAccountById', () => {
    it('should return account detail for valid ID', async () => {
      accountRepository.findOne.mockResolvedValue(mockAccount);

      const result = await service.getAccountById(mockAccount.id);

      expect(result.id).toBe(mockAccount.id);
      expect(result.owner.email).toBe('owner@example.com');
    });

    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(service.getAccountById('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when account not found', async () => {
      const validId = new ObjectId().toHexString();
      accountRepository.findOne.mockResolvedValue(null);

      await expect(service.getAccountById(validId)).rejects.toThrow(NotFoundException);
    });
  });
});
