import { SystemHealthSnapshotEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminSystemHealthService } from './admin-system-health.service';

describe('AdminSystemHealthService', () => {
  let service: AdminSystemHealthService;
  let snapshotRepository: jest.Mocked<EntityRepository<SystemHealthSnapshotEntity>>;

  const mockHealthData = {
    jobStatuses: [
      {
        jobName: 'fetch:accountstats',
        lastStartedAt: '2026-02-18T03:33:00.000Z',
        lastCompletedAt: '2026-02-18T03:33:45.000Z',
        lastStatus: 'success',
        lastDurationMs: 45000,
        lastRecordsProcessed: 10,
        lastErrorMessage: null,
        isOverdue: false,
      },
    ],
    dataFreshness: {
      dailyAccountStats: { latestDate: '2026-02-17T00:00:00.000Z', isStale: false },
      dailyTootStats: { latestDate: '2026-02-17T00:00:00.000Z', isStale: false },
      toots: { latestFetchedAt: '2026-02-18T03:33:00.000Z', isStale: false },
    },
    collectionSizes: {
      users: 50,
      accounts: 45,
      toots: 10000,
      dailyAccountStats: 5000,
      dailyTootStats: 8000,
      refreshTokens: 100,
      mastodonApps: 5,
      cliJobRuns: 500,
    },
    timingMargins: [
      {
        fetchJob: 'fetch:accountstats',
        aggregateJob: 'aggregate:dailyaccountstats',
        last7Days: {
          sampleCount: 7,
          overlapCount: 0,
          minMarginMs: 1200000,
          maxMarginMs: 1800000,
          avgMarginMs: 1500000,
          details: [],
        },
      },
    ],
    recentFailures: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSystemHealthService,
        {
          provide: getRepositoryToken(SystemHealthSnapshotEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminSystemHealthService>(AdminSystemHealthService);
    snapshotRepository = module.get(getRepositoryToken(SystemHealthSnapshotEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSystemHealth', () => {
    it('should return snapshot data with generatedAt when snapshot exists', async () => {
      const generatedAt = new Date('2026-02-18T03:17:00.000Z');
      snapshotRepository.find.mockResolvedValue([
        {
          generatedAt,
          data: mockHealthData,
        } as unknown as SystemHealthSnapshotEntity,
      ]);

      const result = await service.getSystemHealth();

      expect(result.generatedAt).toBe('2026-02-18T03:17:00.000Z');
      expect(result.jobStatuses).toEqual(mockHealthData.jobStatuses);
      expect(result.dataFreshness).toEqual(mockHealthData.dataFreshness);
      expect(result.collectionSizes).toEqual(mockHealthData.collectionSizes);
      expect(result.timingMargins).toEqual(mockHealthData.timingMargins);
      expect(result.recentFailures).toEqual(mockHealthData.recentFailures);
    });

    it('should query with orderBy generatedAt DESC and limit 1', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      await service.getSystemHealth();

      expect(snapshotRepository.find).toHaveBeenCalledWith(
        { generatedAt: { $ne: null } },
        { orderBy: { generatedAt: 'DESC' }, limit: 1 },
      );
    });

    it('should return empty structure without generatedAt when no snapshot exists', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      const result = await service.getSystemHealth();

      expect(result.generatedAt).toBeUndefined();
      expect(result.jobStatuses).toEqual([]);
      expect(result.dataFreshness.dailyAccountStats.isStale).toBe(true);
      expect(result.dataFreshness.dailyTootStats.isStale).toBe(true);
      expect(result.dataFreshness.toots.isStale).toBe(true);
      expect(result.collectionSizes.users).toBe(0);
      expect(result.timingMargins).toEqual([]);
      expect(result.recentFailures).toEqual([]);
    });

    it('should return complete health structure with all sections', async () => {
      snapshotRepository.find.mockResolvedValue([
        {
          generatedAt: new Date(),
          data: mockHealthData,
        } as unknown as SystemHealthSnapshotEntity,
      ]);

      const result = await service.getSystemHealth();

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('jobStatuses');
      expect(result).toHaveProperty('dataFreshness');
      expect(result).toHaveProperty('collectionSizes');
      expect(result).toHaveProperty('timingMargins');
      expect(result).toHaveProperty('recentFailures');
      expect(result.jobStatuses).toHaveLength(1);
      expect(result.jobStatuses[0]).toHaveProperty('jobName');
      expect(result.jobStatuses[0]).toHaveProperty('isOverdue');
      expect(result.dataFreshness).toHaveProperty('dailyAccountStats');
      expect(result.dataFreshness).toHaveProperty('dailyTootStats');
      expect(result.dataFreshness).toHaveProperty('toots');
    });
  });
});
