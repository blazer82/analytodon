import { AdminStatsSnapshotEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let snapshotRepository: jest.Mocked<EntityRepository<AdminStatsSnapshotEntity>>;

  const mockStatsData = {
    users: {
      totalCount: 100,
      activeCount: 85,
      inactiveCount: 15,
      emailVerifiedCount: 90,
      roleBreakdown: { admin: 3, accountOwner: 97 },
      registrations: {
        last30DaysCount: 10,
        dailyBreakdown: [
          { date: '2026-02-01', count: 3 },
          { date: '2026-02-02', count: 7 },
        ],
      },
      loginActivity: { last7Days: 20, last30Days: 50, last90Days: 75 },
    },
    accounts: {
      totalCount: 150,
      setupCompleteCount: 120,
      setupIncompleteCount: 30,
      activeCount: 100,
      inactiveCount: 50,
      serverDistribution: [
        { serverURL: 'mastodon.social', count: 25 },
        { serverURL: 'mastodon.online', count: 10 },
      ],
    },
    dataVolume: {
      totalToots: 50000,
      totalDailyAccountStats: 10000,
      totalDailyTootStats: 25000,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(AdminStatsSnapshotEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    snapshotRepository = module.get(getRepositoryToken(AdminStatsSnapshotEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return snapshot data with generatedAt when snapshot exists', async () => {
      const generatedAt = new Date('2026-02-18T03:00:00.000Z');
      snapshotRepository.find.mockResolvedValue([
        {
          generatedAt,
          data: mockStatsData,
        } as unknown as AdminStatsSnapshotEntity,
      ]);

      const result = await service.getStats();

      expect(result.generatedAt).toBe('2026-02-18T03:00:00.000Z');
      expect(result.users).toEqual(mockStatsData.users);
      expect(result.accounts).toEqual(mockStatsData.accounts);
      expect(result.dataVolume).toEqual(mockStatsData.dataVolume);
    });

    it('should query with orderBy generatedAt DESC and limit 1', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      await service.getStats();

      expect(snapshotRepository.find).toHaveBeenCalledWith(
        { generatedAt: { $ne: null } },
        { orderBy: { generatedAt: 'DESC' }, limit: 1 },
      );
    });

    it('should return empty stats without generatedAt when no snapshot exists', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.generatedAt).toBeUndefined();
      expect(result.users.totalCount).toBe(0);
      expect(result.users.activeCount).toBe(0);
      expect(result.users.inactiveCount).toBe(0);
      expect(result.users.emailVerifiedCount).toBe(0);
      expect(result.users.roleBreakdown).toEqual({ admin: 0, accountOwner: 0 });
      expect(result.users.registrations).toEqual({ last30DaysCount: 0, dailyBreakdown: [] });
      expect(result.users.loginActivity).toEqual({ last7Days: 0, last30Days: 0, last90Days: 0 });
      expect(result.accounts.totalCount).toBe(0);
      expect(result.accounts.serverDistribution).toEqual([]);
      expect(result.dataVolume.totalToots).toBe(0);
    });

    it('should return complete stats structure with all sections', async () => {
      snapshotRepository.find.mockResolvedValue([
        {
          generatedAt: new Date(),
          data: mockStatsData,
        } as unknown as AdminStatsSnapshotEntity,
      ]);

      const result = await service.getStats();

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('accounts');
      expect(result).toHaveProperty('dataVolume');
      expect(result.users).toHaveProperty('totalCount');
      expect(result.users).toHaveProperty('activeCount');
      expect(result.users).toHaveProperty('roleBreakdown');
      expect(result.users).toHaveProperty('registrations');
      expect(result.users).toHaveProperty('loginActivity');
      expect(result.accounts).toHaveProperty('serverDistribution');
      expect(result.dataVolume).toHaveProperty('totalToots');
    });
  });
});
