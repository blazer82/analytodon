import { AccountHealthSnapshotEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminHealthService } from './admin-health.service';

describe('AdminHealthService', () => {
  let service: AdminHealthService;
  let snapshotRepository: jest.Mocked<EntityRepository<AccountHealthSnapshotEntity>>;

  const mockHealthData = {
    staleAccounts: [
      {
        accountId: '507f1f77bcf86cd799439011',
        accountName: 'stale@mastodon.social',
        serverURL: 'mastodon.social',
        ownerEmail: 'owner@example.com',
        lastStatsDate: '2026-02-10T00:00:00.000Z',
        daysSinceLastUpdate: 8,
      },
    ],
    incompleteAccounts: [
      {
        accountId: '507f1f77bcf86cd799439012',
        accountName: null,
        serverURL: 'mastodon.online',
        ownerEmail: 'newuser@example.com',
        createdDate: '2026-01-15T00:00:00.000Z',
        daysSinceCreation: 34,
      },
    ],
    abandonedAccounts: [
      {
        accountId: '507f1f77bcf86cd799439013',
        accountName: 'abandoned@mastodon.social',
        serverURL: 'mastodon.social',
        ownerEmail: 'ghost@example.com',
        lastLoginDate: null,
        deletionNoticeSent: false,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminHealthService,
        {
          provide: getRepositoryToken(AccountHealthSnapshotEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminHealthService>(AdminHealthService);
    snapshotRepository = module.get(getRepositoryToken(AccountHealthSnapshotEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccountHealth', () => {
    it('should return snapshot data with generatedAt when snapshot exists', async () => {
      const generatedAt = new Date('2026-02-18T03:00:00.000Z');
      snapshotRepository.find.mockResolvedValue([
        {
          generatedAt,
          data: mockHealthData,
        } as unknown as AccountHealthSnapshotEntity,
      ]);

      const result = await service.getAccountHealth();

      expect(result.generatedAt).toBe('2026-02-18T03:00:00.000Z');
      expect(result.staleAccounts).toEqual(mockHealthData.staleAccounts);
      expect(result.incompleteAccounts).toEqual(mockHealthData.incompleteAccounts);
      expect(result.abandonedAccounts).toEqual(mockHealthData.abandonedAccounts);
    });

    it('should query with orderBy generatedAt DESC and limit 1', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      await service.getAccountHealth();

      expect(snapshotRepository.find).toHaveBeenCalledWith(
        { generatedAt: { $ne: null } },
        { orderBy: { generatedAt: 'DESC' }, limit: 1 },
      );
    });

    it('should return empty arrays without generatedAt when no snapshot exists', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      const result = await service.getAccountHealth();

      expect(result.generatedAt).toBeUndefined();
      expect(result.staleAccounts).toEqual([]);
      expect(result.incompleteAccounts).toEqual([]);
      expect(result.abandonedAccounts).toEqual([]);
    });

    it('should return complete health structure with all sections', async () => {
      snapshotRepository.find.mockResolvedValue([
        {
          generatedAt: new Date(),
          data: mockHealthData,
        } as unknown as AccountHealthSnapshotEntity,
      ]);

      const result = await service.getAccountHealth();

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('staleAccounts');
      expect(result).toHaveProperty('incompleteAccounts');
      expect(result).toHaveProperty('abandonedAccounts');
      expect(result.staleAccounts).toHaveLength(1);
      expect(result.staleAccounts[0]).toHaveProperty('accountId');
      expect(result.staleAccounts[0]).toHaveProperty('daysSinceLastUpdate');
      expect(result.incompleteAccounts[0]).toHaveProperty('daysSinceCreation');
      expect(result.abandonedAccounts[0]).toHaveProperty('deletionNoticeSent');
    });
  });
});
