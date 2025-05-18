import { Rel } from '@mikro-orm/core';
import { EntityManager, EntityRepository, FilterQuery, ObjectId } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AccountEntity } from '../accounts/entities/account.entity';
import { GetTopTootsOptions, TootRankingEnum } from './dto/get-top-toots-query.dto';
import { TootEntity } from './entities/toot.entity';
import { TootsService } from './toots.service';

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

  beforeEach(async () => {
    // Mock EntityManager
    mockEm = {
      aggregate: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    // Mock TootRepository (even if not directly used by getTopToots, it's part of the service constructor)
    mockTootRepository = {
      // Add any methods if the service starts using the repository directly
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
});
