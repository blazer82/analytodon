import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';

import { GetTopTootsOptions, TootRankingEnum } from './dto/get-top-toots-query.dto';
import { RankedTootDto } from './dto/ranked-toot.dto';
import { TootEntity } from './entities/toot.entity';

@Injectable()
export class TootsService {
  private readonly logger = new Logger(TootsService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(TootEntity)
    private readonly tootRepository: EntityRepository<TootEntity>,
  ) {}

  /**
   * Retrieves top toots based on specified ranking criteria, limit, and date range.
   * @param options - Options for fetching top toots, including accountId, limit, ranking, dateFrom, and dateTo.
   * @returns A promise that resolves to an array of ranked toot DTOs.
   * @throws Error if fetching top toots fails.
   */
  async getTopToots(options: GetTopTootsOptions): Promise<RankedTootDto[]> {
    const { accountId, limit = 5, ranking = TootRankingEnum.TOP, dateFrom, dateTo } = options;

    const matchConditions: FilterQuery<TootEntity> = { account: new ObjectId(accountId) };

    if (dateFrom) {
      matchConditions.createdAt = { $gte: dateFrom };
    }
    if (dateTo) {
      matchConditions.createdAt = { ...((matchConditions.createdAt as object) || {}), $lt: dateTo };
    }

    let rankExpression: object;
    switch (ranking) {
      case TootRankingEnum.REPLIES:
        rankExpression = { $ifNull: ['$repliesCount', 0] };
        break;
      case TootRankingEnum.BOOSTS:
        rankExpression = { $ifNull: ['$reblogsCount', 0] };
        break;
      case TootRankingEnum.FAVOURITES:
        rankExpression = { $ifNull: ['$favouritesCount', 0] };
        break;
      case TootRankingEnum.TOP:
      default:
        rankExpression = { $add: [{ $ifNull: ['$reblogsCount', 0] }, { $ifNull: ['$repliesCount', 0] }] };
        break;
    }

    const pipeline: object[] = [
      { $match: matchConditions },
      {
        $addFields: {
          rank: rankExpression,
        },
      },
      { $match: { rank: { $gt: 0 } } }, // Only include toots with some interaction
      { $sort: { rank: -1, createdAt: -1 } },
      { $limit: limit },
    ];

    try {
      const results: (TootEntity & { rank: number })[] = await this.em.aggregate(TootEntity, pipeline);

      return results.map((toot) => ({
        id: toot._id.toString(),
        content: toot.content,
        url: toot.url,
        reblogsCount: toot.reblogsCount,
        repliesCount: toot.repliesCount,
        favouritesCount: toot.favouritesCount,
        createdAt: toot.createdAt,
        rank: toot.rank,
      }));
    } catch (error) {
      this.logger.error(`Error fetching top toots for account ${accountId}: ${error.message}`, error.stack);
      throw error; // Or handle more gracefully
    }
  }
}
