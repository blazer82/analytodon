import { AccountEntity, HashtagStatsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { Loaded } from '@mikro-orm/core';
import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';

import * as timeframeHelper from '../shared/utils/timeframe.helper';
import { HashtagsService } from './hashtags.service';

jest.mock('../shared/utils/timeframe.helper');

describe('HashtagsService', () => {
  let service: HashtagsService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockHashtagStatsRepository: jest.Mocked<EntityRepository<HashtagStatsEntity>>;

  const mockUser = {
    id: new ObjectId().toHexString(),
    email: 'test@example.com',
    role: UserRole.AccountOwner,
  } as UserEntity;

  const mockAccountId = new ObjectId().toHexString();
  const mockAccount = {
    id: mockAccountId,
    owner: mockUser,
    timezone: 'Europe/Berlin',
    setupComplete: true,
  } as Loaded<AccountEntity>;

  const mockedResolveTimeframe = timeframeHelper.resolveTimeframe as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockEm = {
      aggregate: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    mockHashtagStatsRepository = {} as unknown as jest.Mocked<EntityRepository<HashtagStatsEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HashtagsService,
        { provide: EntityManager, useValue: mockEm },
        { provide: getRepositoryToken(HashtagStatsEntity), useValue: mockHashtagStatsRepository },
      ],
    })
      .setLogger(new Logger())
      .compile();
    module.useLogger(false);

    service = module.get<HashtagsService>(HashtagsService);

    mockedResolveTimeframe.mockReturnValue({
      dateFrom: new Date('2024-01-01T00:00:00.000Z'),
      dateTo: new Date('2024-01-31T00:00:00.000Z'),
      timeframe: 'last30days',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTopHashtags', () => {
    it('should return top hashtags sorted by tootCount', async () => {
      const mockResults = [
        { _id: 'typescript', tootCount: 15, repliesCount: 10, reblogsCount: 20, favouritesCount: 30 },
        { _id: 'javascript', tootCount: 10, repliesCount: 5, reblogsCount: 10, favouritesCount: 15 },
      ];
      mockEm.aggregate.mockResolvedValue(mockResults);

      const result = await service.getTopHashtags(mockAccount, 'last30days', 10);

      expect(mockEm.aggregate).toHaveBeenCalledWith(HashtagStatsEntity, expect.any(Array));
      const pipeline = mockEm.aggregate.mock.calls[0][1];
      expect(pipeline).toHaveLength(4); // $match, $group, $sort, $limit
      expect(pipeline[2]).toEqual({ $sort: { tootCount: -1 } });
      expect(pipeline[3]).toEqual({ $limit: 10 });

      expect(result).toEqual([
        { hashtag: 'typescript', tootCount: 15, repliesCount: 10, reblogsCount: 20, favouritesCount: 30 },
        { hashtag: 'javascript', tootCount: 10, repliesCount: 5, reblogsCount: 10, favouritesCount: 15 },
      ]);
    });

    it('should return empty array when no data', async () => {
      mockEm.aggregate.mockResolvedValue([]);

      const result = await service.getTopHashtags(mockAccount, 'last30days');
      expect(result).toEqual([]);
    });
  });

  describe('getOverTime', () => {
    it('should return over time data with pivot format', async () => {
      // First call: getTopHashtags aggregation
      const topHashtagsResult = [
        { _id: 'typescript', tootCount: 10, repliesCount: 5, reblogsCount: 8, favouritesCount: 12 },
        { _id: 'rust', tootCount: 5, repliesCount: 2, reblogsCount: 3, favouritesCount: 4 },
      ];
      // Second call: daily data aggregation
      const dailyDataResult = [
        { day: new Date('2024-01-15T00:00:00.000Z'), hashtag: 'typescript', tootCount: 3 },
        { day: new Date('2024-01-15T00:00:00.000Z'), hashtag: 'rust', tootCount: 1 },
        { day: new Date('2024-01-16T00:00:00.000Z'), hashtag: 'typescript', tootCount: 2 },
      ];

      mockEm.aggregate.mockResolvedValueOnce(topHashtagsResult).mockResolvedValueOnce(dailyDataResult);

      const result = await service.getOverTime(mockAccount, 'last30days', 10);

      expect(result.hashtags).toEqual(['typescript', 'rust']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ day: '2024-01-15', typescript: 3, rust: 1 });
      expect(result.data[1]).toEqual({ day: '2024-01-16', typescript: 2, rust: 0 });
    });

    it('should return empty data when no top hashtags', async () => {
      mockEm.aggregate.mockResolvedValueOnce([]);

      const result = await service.getOverTime(mockAccount, 'last30days');
      expect(result).toEqual({ hashtags: [], data: [] });
    });
  });

  describe('getEngagement', () => {
    it('should return engagement data sorted by totalEngagement', async () => {
      const mockResults = [
        {
          _id: 'typescript',
          tootCount: 10,
          repliesCount: 5,
          reblogsCount: 20,
          favouritesCount: 25,
          totalEngagement: 50,
          avgEngagementPerToot: 5,
        },
      ];
      mockEm.aggregate.mockResolvedValue(mockResults);

      const result = await service.getEngagement(mockAccount, 'last30days');

      expect(result).toHaveLength(1);
      expect(result[0].hashtag).toBe('typescript');
      expect(result[0].totalEngagement).toBe(50);
      expect(result[0].avgEngagementPerToot).toBe(5);

      const pipeline = mockEm.aggregate.mock.calls[0][1];
      expect(pipeline).toHaveLength(5); // $match, $group, $addFields, $sort, $limit
      expect(pipeline[3]).toEqual({ $sort: { totalEngagement: -1 } });
    });
  });

  describe('getMostEffective', () => {
    it('should return most effective hashtags with minTootCount filter', async () => {
      const mockResults = [
        {
          _id: 'rust',
          tootCount: 5,
          repliesCount: 10,
          reblogsCount: 30,
          favouritesCount: 40,
          totalEngagement: 80,
          avgEngagementPerToot: 16,
        },
      ];
      mockEm.aggregate.mockResolvedValue(mockResults);

      const result = await service.getMostEffective(mockAccount, 'last30days', 10, 3);

      expect(result).toHaveLength(1);
      expect(result[0].hashtag).toBe('rust');
      expect(result[0].avgEngagementPerToot).toBe(16);

      const pipeline = mockEm.aggregate.mock.calls[0][1];
      expect(pipeline).toHaveLength(6); // $match, $group, $match (minTootCount), $addFields, $sort, $limit
      // Check that the second $match filters by minTootCount
      expect(pipeline[2]).toEqual({ $match: { tootCount: { $gte: 3 } } });
      // Sort by avgEngagementPerToot
      expect(pipeline[4]).toEqual({ $sort: { avgEngagementPerToot: -1 } });
    });

    it('should use default minTootCount of 2', async () => {
      mockEm.aggregate.mockResolvedValue([]);

      await service.getMostEffective(mockAccount, 'last30days', 10, 2);

      const pipeline = mockEm.aggregate.mock.calls[0][1];
      expect(pipeline[2]).toEqual({ $match: { tootCount: { $gte: 2 } } });
    });
  });
});
