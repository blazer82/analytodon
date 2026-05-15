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
import { TootsService, TOP_POSTS_CSV_MAX_ROWS } from './toots.service';

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
});
