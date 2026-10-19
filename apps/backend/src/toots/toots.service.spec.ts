import { AccountEntity, TootEntity } from '@analytodon/shared-orm';
import { Loaded, Rel } from '@mikro-orm/core';
import { EntityManager, EntityRepository, FilterQuery, ObjectId } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import * as timeframeHelper from '../shared/utils/timeframe.helper';
import { GetTopTootsOptions, TootRankingEnum } from './dto/get-top-toots-query.dto';
import { PostActivityBucketEnum } from './dto/post-activity.dto';
import {
  pickPostActivityBucket,
  POST_ACTIVITY_DAILY_MAX_DAYS,
  POST_ACTIVITY_WEEKLY_MAX_DAYS,
  TootsService,
  TOP_POSTS_CSV_MAX_ROWS,
} from './toots.service';

jest.mock('csv-stringify');
jest.mock('../shared/utils/timeframe.helper', () => {
  const actual = jest.requireActual('../shared/utils/timeframe.helper');
  return {
    ...actual,
    resolveTimeframe: jest.fn(),
    formatDateISO: jest.fn(),
  };
});

describe('TootsService', () => {
  let service: TootsService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockTootRepository: jest.Mocked<EntityRepository<TootEntity>>; // Though not directly used, good to have if service evolves

  const mockAccountId = new ObjectId().toHexString();
  const mockDateFrom = new Date('2023-01-01T00:00:00.000Z');
  const mockDateTo = new Date('2023-01-31T23:59:59.999Z');

  const mockTootEntities: (TootEntity & { rank?: number })[] = [
    {
      _id: new ObjectId(),
      uri: 'uri1',
      account: new ObjectId(mockAccountId) as unknown as Rel<AccountEntity>, // Simplified for test
      content: 'Toot content 1',
      favouritesCount: 10,
      fetchedAt: new Date(),
      language: 'en',
      reblogsCount: 5,
      repliesCount: 2,
      url: 'http://example.com/toot1',
      visibility: 'public',
      createdAt: new Date('2023-01-10T10:00:00.000Z'),
      rank: 7, // 5 (reblogs) + 2 (replies) for TOP ranking
    },
    {
      _id: new ObjectId(),
      uri: 'uri2',
      account: new ObjectId(mockAccountId) as unknown as Rel<AccountEntity>,
      content: 'Toot content 2',
      favouritesCount: 20,
      fetchedAt: new Date(),
      language: 'en',
      reblogsCount: 10,
      repliesCount: 3,
      url: 'http://example.com/toot2',
      visibility: 'public',
      createdAt: new Date('2023-01-15T10:00:00.000Z'),
      rank: 13, // 10 (reblogs) + 3 (replies) for TOP ranking
    },
  ];

  const mockedResolveTimeframe = timeframeHelper.resolveTimeframe as jest.Mock;
  const mockedFormatDateISO = timeframeHelper.formatDateISO as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock EntityManager
    mockEm = {
      aggregate: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    // Mock TootRepository
    mockTootRepository = {
      find: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<EntityRepository<TootEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TootsService,
        { provide: EntityManager, useValue: mockEm },
        { provide: getRepositoryToken(TootEntity), useValue: mockTootRepository },
      ],
    })
      .setLogger(new Logger())
      .compile();
    module.useLogger(false); // Disable logger for tests

    service = module.get<TootsService>(TootsService);

    mockedResolveTimeframe.mockReturnValue({
      dateFrom: new Date('2023-01-01T00:00:00.000Z'),
      dateTo: new Date('2023-02-01T00:00:00.000Z'),
      timeframe: 'last30days',
    });
    mockedFormatDateISO.mockImplementation((date: Date | undefined) =>
      date ? date.toISOString().split('T')[0] : null,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTopToots', () => {
    it('should fetch top toots with default ranking (TOP) and limit', async () => {
      mockEm.aggregate.mockResolvedValue([mockTootEntities[1], mockTootEntities[0]]); // Simulate DB sort by rank
      const options: GetTopTootsOptions = { accountId: mockAccountId };
      const result = await service.getTopToots(options);

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([
          expect.objectContaining({ $match: { account: new ObjectId(mockAccountId) } }),
          expect.objectContaining({
            $addFields: {
              rank: { $add: [{ $ifNull: ['$reblogsCount', 0] }, { $ifNull: ['$repliesCount', 0] }] },
            },
          }),
          expect.objectContaining({ $limit: 5 }), // Default limit
        ]),
      );
      expect(result.length).toBe(2);
      expect(result[0]._id.toString()).toBe(mockTootEntities[1]._id.toString());
      expect(result[0].rank).toBe(mockTootEntities[1].rank);
    });

    it('should fetch top toots with REPLIES ranking', async () => {
      mockEm.aggregate.mockResolvedValue(mockTootEntities);
      const options: GetTopTootsOptions = {
        accountId: mockAccountId,
        ranking: TootRankingEnum.REPLIES,
        limit: 1,
      };
      await service.getTopToots(options);

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([
          expect.objectContaining({
            $addFields: {
              rank: { $ifNull: ['$repliesCount', 0] },
            },
          }),
          expect.objectContaining({ $limit: 1 }),
        ]),
      );
    });

    it('should fetch top toots with BOOSTS ranking', async () => {
      mockEm.aggregate.mockResolvedValue(mockTootEntities);
      const options: GetTopTootsOptions = {
        accountId: mockAccountId,
        ranking: TootRankingEnum.BOOSTS,
      };
      await service.getTopToots(options);

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([
          expect.objectContaining({
            $addFields: {
              rank: { $ifNull: ['$reblogsCount', 0] },
            },
          }),
        ]),
      );
    });

    it('should fetch top toots with FAVOURITES ranking', async () => {
      mockEm.aggregate.mockResolvedValue(mockTootEntities);
      const options: GetTopTootsOptions = {
        accountId: mockAccountId,
        ranking: TootRankingEnum.FAVOURITES,
      };
      await service.getTopToots(options);

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([
          expect.objectContaining({
            $addFields: {
              rank: { $ifNull: ['$favouritesCount', 0] },
            },
          }),
        ]),
      );
    });

    it('should include dateFrom and dateTo in match conditions if provided', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      const options: GetTopTootsOptions = {
        accountId: mockAccountId,
        dateFrom: mockDateFrom,
        dateTo: mockDateTo,
      };
      await service.getTopToots(options);

      const expectedMatchConditions: FilterQuery<TootEntity> = {
        account: new ObjectId(mockAccountId),
        createdAt: { $gte: mockDateFrom, $lt: mockDateTo },
      };

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([expect.objectContaining({ $match: expectedMatchConditions })]),
      );
    });

    it('should include only dateFrom if dateTo is not provided', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      const options: GetTopTootsOptions = {
        accountId: mockAccountId,
        dateFrom: mockDateFrom,
      };
      await service.getTopToots(options);

      const expectedMatchConditions: FilterQuery<TootEntity> = {
        account: new ObjectId(mockAccountId),
        createdAt: { $gte: mockDateFrom },
      };

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([expect.objectContaining({ $match: expectedMatchConditions })]),
      );
    });

    it('should include only dateTo if dateFrom is not provided', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      const options: GetTopTootsOptions = {
        accountId: mockAccountId,
        dateTo: mockDateTo,
      };
      await service.getTopToots(options);

      const expectedMatchConditions: FilterQuery<TootEntity> = {
        account: new ObjectId(mockAccountId),
        createdAt: { $lt: mockDateTo },
      };

      expect(mockEm.aggregate).toHaveBeenCalledWith(
        TootEntity,
        expect.arrayContaining([expect.objectContaining({ $match: expectedMatchConditions })]),
      );
    });

    it('should return an empty array if no toots are found', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      const options: GetTopTootsOptions = { accountId: mockAccountId };
      const result = await service.getTopToots(options);
      expect(result).toEqual([]);
    });

    it('should map TootEntity results to RankedTootDto correctly', async () => {
      const singleToot = mockTootEntities[0];
      mockEm.aggregate.mockResolvedValue([singleToot]);
      const options: GetTopTootsOptions = { accountId: mockAccountId, limit: 1 };
      const result = await service.getTopToots(options);

      expect(result.length).toBe(1);
      const mappedToot = result[0];
      expect(mappedToot._id.toString()).toBe(singleToot._id.toString());
      expect(mappedToot.content).toBe(singleToot.content);
      expect(mappedToot.url).toBe(singleToot.url);
      expect(mappedToot.reblogsCount).toBe(singleToot.reblogsCount);
      expect(mappedToot.repliesCount).toBe(singleToot.repliesCount);
      expect(mappedToot.favouritesCount).toBe(singleToot.favouritesCount);
      expect(mappedToot.createdAt).toBe(singleToot.createdAt);
      expect(mappedToot.rank).toBe(singleToot.rank);
    });

    it('should throw an error if aggregation fails', async () => {
      const testError = new Error('Aggregation failed');
      mockEm.aggregate.mockRejectedValue(testError);
      const options: GetTopTootsOptions = { accountId: mockAccountId };

      await expect(service.getTopToots(options)).rejects.toThrow(testError);
    });
  });

  describe('getPostingTimes', () => {
    type GroupStage = {
      $group: {
        _id: {
          weekday: { $isoDayOfWeek: { timezone: string } };
          hour: { $hour: { timezone: string } };
        };
      };
    };
    const getGroupStage = () => (mockEm.aggregate.mock.calls[0][1] as object[])[1] as GroupStage;

    const mockAccount = {
      id: mockAccountId,
      timezone: 'Europe/Berlin',
    } as Loaded<AccountEntity>;

    it('groups toots by ISO weekday and hour in the account timezone', async () => {
      mockEm.aggregate.mockResolvedValue([]);

      await service.getPostingTimes(mockAccount, 'last30days');

      expect(mockedResolveTimeframe).toHaveBeenCalledWith('Europe/Berlin', 'last30days', {
        dateFrom: undefined,
        dateTo: undefined,
      });
      expect(mockEm.aggregate).toHaveBeenCalledWith(TootEntity, [
        {
          $match: {
            account: new ObjectId(mockAccountId),
            createdAt: {
              $gte: new Date('2023-01-01T00:00:00.000Z'),
              $lt: new Date('2023-02-01T00:00:00.000Z'),
            },
          },
        },
        {
          $group: {
            _id: {
              weekday: { $isoDayOfWeek: { date: '$createdAt', timezone: 'Europe/Berlin' } },
              hour: { $hour: { date: '$createdAt', timezone: 'Europe/Berlin' } },
            },
            posts: { $sum: 1 },
            engagement: {
              $sum: {
                $add: [
                  { $ifNull: ['$repliesCount', 0] },
                  { $ifNull: ['$reblogsCount', 0] },
                  { $ifNull: ['$favouritesCount', 0] },
                ],
              },
            },
          },
        },
        { $sort: { '_id.weekday': 1, '_id.hour': 1 } },
      ]);
    });

    it('maps aggregation results to slots and returns the timezone and timeframe used', async () => {
      mockEm.aggregate.mockResolvedValue([
        { _id: { weekday: 1, hour: 9 }, posts: 3, engagement: 42 },
        { _id: { weekday: 7, hour: 23 }, posts: 1, engagement: 0 },
      ]);

      const result = await service.getPostingTimes(mockAccount, 'last30days');

      expect(result).toEqual({
        data: [
          { weekday: 1, hour: 9, posts: 3, engagement: 42 },
          { weekday: 7, hour: 23, posts: 1, engagement: 0 },
        ],
        timezone: 'Europe/Berlin',
        timeframe: 'last30days',
      });
    });

    it('passes custom date ranges on to resolveTimeframe', async () => {
      mockEm.aggregate.mockResolvedValue([]);

      await service.getPostingTimes(mockAccount, 'custom', '2023-01-01', '2023-01-31');

      expect(mockedResolveTimeframe).toHaveBeenCalledWith('Europe/Berlin', 'custom', {
        dateFrom: '2023-01-01',
        dateTo: '2023-01-31',
      });
    });

    it('normalizes timezones that contain spaces', async () => {
      mockEm.aggregate.mockResolvedValue([]);

      const result = await service.getPostingTimes(
        { ...mockAccount, timezone: 'America/New York' } as Loaded<AccountEntity>,
        'last30days',
      );

      expect(result.timezone).toBe('America/New_York');
      expect(getGroupStage().$group._id.hour.$hour.timezone).toBe('America/New_York');
    });

    it.each([[''], [undefined], ['Not/AZone']])('falls back to UTC for timezone %p', async (timezone) => {
      mockEm.aggregate.mockResolvedValue([]);

      const result = await service.getPostingTimes({ ...mockAccount, timezone } as Loaded<AccountEntity>, 'last30days');

      expect(result.timezone).toBe('UTC');
      expect(mockedResolveTimeframe).toHaveBeenCalledWith('UTC', 'last30days', expect.anything());
      expect(getGroupStage().$group._id.weekday.$isoDayOfWeek.timezone).toBe('UTC');
      expect(getGroupStage().$group._id.hour.$hour.timezone).toBe('UTC');
    });

    it('propagates aggregation errors', async () => {
      mockEm.aggregate.mockRejectedValue(new Error('DB error'));

      await expect(service.getPostingTimes(mockAccount, 'last30days')).rejects.toThrow('DB error');
    });
  });

  describe('getTootsForCsv', () => {
    it('should query toots in range, newest first, capped at the default limit', async () => {
      mockTootRepository.find.mockResolvedValue(mockTootEntities);
      const result = await service.getTootsForCsv(mockAccountId, mockDateFrom, mockDateTo);

      expect(mockTootRepository.find).toHaveBeenCalledWith(
        { account: mockAccountId, createdAt: { $gte: mockDateFrom, $lt: mockDateTo } },
        { orderBy: { createdAt: 'DESC' }, limit: TOP_POSTS_CSV_MAX_ROWS },
      );
      expect(result).toEqual(mockTootEntities);
    });

    it('should respect a smaller limit when passed explicitly', async () => {
      mockTootRepository.find.mockResolvedValue([]);
      await service.getTootsForCsv(mockAccountId, mockDateFrom, mockDateTo, 50);

      expect(mockTootRepository.find).toHaveBeenCalledWith(
        { account: mockAccountId, createdAt: { $gte: mockDateFrom, $lt: mockDateTo } },
        { orderBy: { createdAt: 'DESC' }, limit: 50 },
      );
    });
  });

  describe('exportCsv', () => {
    let mockRes: jest.Mocked<Response>;
    let mockStringifier: { pipe: jest.Mock; on: jest.Mock; write: jest.Mock; end: jest.Mock };

    const mockAccount = {
      id: mockAccountId,
      timezone: 'Europe/Berlin',
    } as Loaded<AccountEntity>;

    beforeEach(() => {
      mockStringifier = {
        pipe: jest.fn(),
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
      (stringify as jest.Mock).mockReturnValue(mockStringifier);

      mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as jest.Mocked<Response>;
    });

    it('should write one row per toot with HTML stripped from content', async () => {
      const toots: TootEntity[] = [
        {
          ...mockTootEntities[0],
          content: '<p>Hello <a href="https://x.example">world</a></p>',
          createdAt: new Date('2023-01-15T10:00:00.000Z'),
          url: 'http://example.com/toot1',
          visibility: 'public',
          language: 'en',
          repliesCount: 2,
          reblogsCount: 5,
          favouritesCount: 10,
        },
      ];
      mockTootRepository.find.mockResolvedValue(toots);

      await service.exportCsv(mockAccount, 'last30days', mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=top-posts-${mockAccountId}-last30days.csv`,
      );
      expect(stringify).toHaveBeenCalledWith({ header: true, delimiter: ';' });
      expect(mockStringifier.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockStringifier.write).toHaveBeenCalledWith({
        Date: '2023-01-15',
        URL: 'http://example.com/toot1',
        Visibility: 'public',
        Language: 'en',
        Replies: 2,
        Boosts: 5,
        Favorites: 10,
        Content: 'Hello world',
      });
      expect(mockStringifier.end).toHaveBeenCalled();
    });

    it('should prefix CSV-injection-prone Content and URL cells with a single quote', async () => {
      const toots: TootEntity[] = [
        {
          ...mockTootEntities[0],
          content: '<p>=cmd|"/c calc"!A1</p>',
          createdAt: new Date('2023-01-15T10:00:00.000Z'),
          url: '=HYPERLINK("http://bad.example","click")',
          visibility: 'public',
          language: 'en',
          repliesCount: 0,
          reblogsCount: 0,
          favouritesCount: 0,
        },
      ];
      mockTootRepository.find.mockResolvedValue(toots);

      await service.exportCsv(mockAccount, 'last30days', mockRes);

      expect(mockStringifier.write).toHaveBeenCalledWith(
        expect.objectContaining({
          URL: `'=HYPERLINK("http://bad.example","click")`,
          Content: `'=cmd|"/c calc"!A1`,
        }),
      );
    });

    it('should handle errors and respond 500 when headers not yet sent', async () => {
      mockTootRepository.find.mockResolvedValue([]);
      const testError = new Error('CSV error');
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') callback(testError);
      });
      mockRes.headersSent = false;

      await service.exportCsv(mockAccount, 'last30days', mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error generating CSV');
    });
  });

  describe('pickPostActivityBucket', () => {
    it('should bucket per day up to the daily threshold, per week up to the weekly threshold, else per month', () => {
      expect(pickPostActivityBucket(1)).toBe(PostActivityBucketEnum.DAY);
      expect(pickPostActivityBucket(POST_ACTIVITY_DAILY_MAX_DAYS)).toBe(PostActivityBucketEnum.DAY);
      expect(pickPostActivityBucket(POST_ACTIVITY_DAILY_MAX_DAYS + 1)).toBe(PostActivityBucketEnum.WEEK);
      expect(pickPostActivityBucket(POST_ACTIVITY_WEEKLY_MAX_DAYS)).toBe(PostActivityBucketEnum.WEEK);
      expect(pickPostActivityBucket(POST_ACTIVITY_WEEKLY_MAX_DAYS + 1)).toBe(PostActivityBucketEnum.MONTH);
      expect(pickPostActivityBucket(366)).toBe(PostActivityBucketEnum.MONTH);
    });
  });

  describe('getPostActivity', () => {
    // September 2026 in Europe/Berlin (UTC+2): [Sep 1 00:00 local, Oct 1 00:00 local)
    const septemberFrom = new Date('2026-08-31T22:00:00.000Z');
    const septemberTo = new Date('2026-09-30T22:00:00.000Z');

    it('should count posts per local day with zero-filled buckets in the account timezone', async () => {
      mockEm.aggregate.mockResolvedValue([
        { _id: '2026-09-01', count: 1 },
        { _id: '2026-09-09', count: 4 },
        { _id: '2026-09-30', count: 2 },
      ]);
      mockTootRepository.count.mockResolvedValue(0);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom: septemberFrom,
        dateTo: septemberTo,
      });

      expect(mockEm.aggregate).toHaveBeenCalledWith(TootEntity, [
        {
          $match: { account: new ObjectId(mockAccountId), createdAt: { $gte: septemberFrom, $lt: septemberTo } },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Berlin' } },
            count: { $sum: 1 },
          },
        },
      ]);
      expect(result.bucket).toBe(PostActivityBucketEnum.DAY);
      expect(result.days).toBe(30);
      expect(result.dateFrom).toBe('2026-09-01');
      expect(result.dateTo).toBe('2026-09-30');
      expect(result.chart).toHaveLength(30);
      expect(result.chart[0]).toEqual({ time: '2026-09-01', value: 1 });
      expect(result.chart[1]).toEqual({ time: '2026-09-02', value: 0 });
      expect(result.chart[8]).toEqual({ time: '2026-09-09', value: 4 });
      expect(result.chart[29]).toEqual({ time: '2026-09-30', value: 2 });
      expect(result.total).toBe(7);
      expect(result.daysWithoutPosts).toBe(27);
      expect(result.busiestDay).toEqual({ date: '2026-09-09', count: 4 });
    });

    it('should compare against the preceding period of equal length', async () => {
      mockEm.aggregate.mockResolvedValue([{ _id: '2026-09-10', count: 40 }]);
      mockTootRepository.count.mockResolvedValue(32);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom: septemberFrom,
        dateTo: septemberTo,
      });

      expect(mockTootRepository.count).toHaveBeenCalledWith({
        account: mockAccountId,
        createdAt: { $gte: new Date('2026-08-01T22:00:00.000Z'), $lt: septemberFrom },
      });
      expect(result.previousPeriodTotal).toBe(32);
      expect(result.trend).toBeCloseTo(0.25);
    });

    it('should return a null trend when the previous period has no posts', async () => {
      mockEm.aggregate.mockResolvedValue([{ _id: '2026-09-10', count: 3 }]);
      mockTootRepository.count.mockResolvedValue(0);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom: septemberFrom,
        dateTo: septemberTo,
      });

      expect(result.previousPeriodTotal).toBe(0);
      expect(result.trend).toBeNull();
    });

    it('should handle a period without posts', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      mockTootRepository.count.mockResolvedValue(5);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom: septemberFrom,
        dateTo: septemberTo,
      });

      expect(result.total).toBe(0);
      expect(result.trend).toBe(-1);
      expect(result.busiestDay).toBeNull();
      expect(result.daysWithoutPosts).toBe(30);
      expect(result.chart.every((point) => point.value === 0)).toBe(true);
    });

    it('should handle a DST transition without duplicating or skipping days', async () => {
      // October 2026 in Europe/Berlin: DST ends on Oct 25, so the period has 31 days but not 31 * 24h
      mockEm.aggregate.mockResolvedValue([{ _id: '2026-10-25', count: 2 }]);
      mockTootRepository.count.mockResolvedValue(0);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom: new Date('2026-09-30T22:00:00.000Z'),
        dateTo: new Date('2026-10-31T23:00:00.000Z'),
      });

      expect(result.days).toBe(31);
      expect(result.chart.map((point) => point.time)).toEqual(
        Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`),
      );
      expect(result.chart[24]).toEqual({ time: '2026-10-25', value: 2 });
    });

    it('should bucket per Monday-based week for longer periods, labelling a partial first week with its first day', async () => {
      // 2026-03-04 (Wednesday) .. 2026-07-01 (Wednesday): 120 days, UTC
      mockEm.aggregate.mockResolvedValue([
        { _id: '2026-03-04', count: 1 },
        { _id: '2026-03-08', count: 2 }, // Sunday, same week as Mar 4
        { _id: '2026-03-09', count: 3 }, // Monday, next week
        { _id: '2026-07-01', count: 4 },
      ]);
      mockTootRepository.count.mockResolvedValue(0);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'UTC',
        dateFrom: new Date('2026-03-04T00:00:00.000Z'),
        dateTo: new Date('2026-07-02T00:00:00.000Z'),
      });

      expect(result.days).toBe(120);
      expect(result.bucket).toBe(PostActivityBucketEnum.WEEK);
      expect(result.chart).toHaveLength(18);
      expect(result.chart[0]).toEqual({ time: '2026-03-04', value: 3 });
      expect(result.chart[1]).toEqual({ time: '2026-03-09', value: 3 });
      expect(result.chart[2]).toEqual({ time: '2026-03-16', value: 0 });
      expect(result.chart[17]).toEqual({ time: '2026-06-29', value: 4 });
      expect(result.total).toBe(10);
      expect(result.busiestDay).toEqual({ date: '2026-07-01', count: 4 });
    });

    it('should bucket per calendar month for year-long periods', async () => {
      mockEm.aggregate.mockResolvedValue([
        { _id: '2025-01-15', count: 2 },
        { _id: '2025-01-31', count: 1 },
        { _id: '2025-12-31', count: 5 },
      ]);
      mockTootRepository.count.mockResolvedValue(4);

      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'UTC',
        dateFrom: new Date('2025-01-01T00:00:00.000Z'),
        dateTo: new Date('2026-01-01T00:00:00.000Z'),
      });

      expect(result.bucket).toBe(PostActivityBucketEnum.MONTH);
      expect(result.days).toBe(365);
      expect(result.chart).toHaveLength(12);
      expect(result.chart[0]).toEqual({ time: '2025-01-01', value: 3 });
      expect(result.chart[1]).toEqual({ time: '2025-02-01', value: 0 });
      expect(result.chart[11]).toEqual({ time: '2025-12-01', value: 5 });
      expect(result.trend).toBeCloseTo(1);
    });

    it('should start the previous period on local midnight across a DST switch (summer -> winter)', async () => {
      // October 2025 in Europe/Berlin (31 days); the previous period starts Aug 31, still in summer time
      mockEm.aggregate.mockResolvedValue([]);
      mockTootRepository.count.mockResolvedValue(0);
      const dateFrom = new Date('2025-09-30T22:00:00.000Z');

      await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom,
        dateTo: new Date('2025-10-31T23:00:00.000Z'),
      });

      expect(mockTootRepository.count).toHaveBeenCalledWith({
        account: mockAccountId,
        createdAt: { $gte: new Date('2025-08-30T22:00:00.000Z'), $lt: dateFrom },
      });
    });

    it('should start the previous period on local midnight across a DST switch (winter -> summer)', async () => {
      // November 2025 in Europe/Berlin (30 days, winter time); the previous period starts Oct 2 (summer time)
      mockEm.aggregate.mockResolvedValue([]);
      mockTootRepository.count.mockResolvedValue(0);
      const dateFrom = new Date('2025-10-31T23:00:00.000Z');

      await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'Europe/Berlin',
        dateFrom,
        dateTo: new Date('2025-11-30T23:00:00.000Z'),
      });

      expect(mockTootRepository.count).toHaveBeenCalledWith({
        account: mockAccountId,
        createdAt: { $gte: new Date('2025-10-01T22:00:00.000Z'), $lt: dateFrom },
      });
    });

    describe('for a period that is still in progress', () => {
      afterEach(() => {
        jest.useRealTimers();
      });

      it('should compare with the previous period only up to the same elapsed time', async () => {
        // "This month" on Oct 19, 2026, 12:00 in Europe/Berlin: Oct 1 .. Oct 19 (19 days)
        jest.useFakeTimers({ now: new Date('2026-10-19T10:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
        mockEm.aggregate.mockResolvedValue([{ _id: '2026-10-05', count: 6 }]);
        mockTootRepository.count.mockResolvedValue(4);

        const result = await service.getPostActivity({
          accountId: mockAccountId,
          timezone: 'Europe/Berlin',
          dateFrom: new Date('2026-09-30T22:00:00.000Z'),
          dateTo: new Date('2026-10-19T22:00:00.000Z'),
        });

        // Previous period: Sep 12 .. Sep 30, cut off at Sep 30, 12:00 local time
        expect(mockTootRepository.count).toHaveBeenCalledWith({
          account: mockAccountId,
          createdAt: {
            $gte: new Date('2026-09-11T22:00:00.000Z'),
            $lt: new Date('2026-09-30T10:00:00.000Z'),
          },
        });
        expect(result.inProgress).toBe(true);
        expect(result.total).toBe(6);
        expect(result.days).toBe(19);
        expect(result.previousPeriodTotal).toBe(4);
        expect(result.trend).toBeCloseTo(0.5);
      });

      it('should compare full periods once the period has ended', async () => {
        jest.useFakeTimers({ now: new Date('2026-10-19T10:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
        mockEm.aggregate.mockResolvedValue([]);
        mockTootRepository.count.mockResolvedValue(0);

        const result = await service.getPostActivity({
          accountId: mockAccountId,
          timezone: 'Europe/Berlin',
          dateFrom: septemberFrom,
          dateTo: septemberTo,
        });

        expect(result.inProgress).toBe(false);
        expect(mockTootRepository.count).toHaveBeenCalledWith({
          account: mockAccountId,
          createdAt: { $gte: new Date('2026-08-01T22:00:00.000Z'), $lt: septemberFrom },
        });
      });
    });

    it('should normalize timezones stored with spaces', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      mockTootRepository.count.mockResolvedValue(0);

      await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'America/New York',
        dateFrom: new Date('2026-09-01T04:00:00.000Z'),
        dateTo: new Date('2026-09-08T04:00:00.000Z'),
      });

      const pipeline = mockEm.aggregate.mock.calls[0][1] as { $group?: { _id: unknown } }[];
      expect(pipeline[1].$group?._id).toEqual({
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/New_York' },
      });
    });

    it('should return an empty chart for an empty period', async () => {
      mockEm.aggregate.mockResolvedValue([]);
      mockTootRepository.count.mockResolvedValue(0);

      const date = new Date('2026-09-01T00:00:00.000Z');
      const result = await service.getPostActivity({
        accountId: mockAccountId,
        timezone: 'UTC',
        dateFrom: date,
        dateTo: date,
      });

      expect(result.days).toBe(0);
      expect(result.chart).toEqual([]);
      expect(result.daysWithoutPosts).toBe(0);
    });
  });
});
