import { AccountEntity, TootEntity } from '@analytodon/shared-orm';
import { EntityRepository, FilterQuery, Loaded } from '@mikro-orm/core';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { escapeCsvCell } from '../shared/utils/csv-cell';
import { stripHtml } from '../shared/utils/strip-html';
import { formatDateISO, resolveTimeframe } from '../shared/utils/timeframe.helper';
import { GetTopTootsOptions, TootRankingEnum } from './dto/get-top-toots-query.dto';

export type RankedTootEntity = TootEntity & { rank: number };

export const TOP_POSTS_CSV_MAX_ROWS = 5000;

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
   * @returns A promise that resolves to an array of TootEntity augmented with a rank.
   * @throws Error if fetching top toots fails.
   */
  async getTopToots(options: GetTopTootsOptions): Promise<RankedTootEntity[]> {
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
      const results: RankedTootEntity[] = await this.em.aggregate(TootEntity, pipeline);
      return results; // Return entities directly with rank
    } catch (error) {
      this.logger.error(`Error fetching top toots for account ${accountId}: ${error.message}`, error.stack);
      throw error; // Or handle more gracefully
    }
  }

  /**
   * Returns toots authored by the account inside the [dateFrom, dateTo) window,
   * ordered newest first. Hard-capped at TOP_POSTS_CSV_MAX_ROWS to keep exports
   * bounded — heavy accounts will see the most recent slice of the timeframe.
   */
  async getTootsForCsv(
    accountId: string,
    dateFrom: Date,
    dateTo: Date,
    limit: number = TOP_POSTS_CSV_MAX_ROWS,
  ): Promise<TootEntity[]> {
    return this.tootRepository.find(
      { account: accountId, createdAt: { $gte: dateFrom, $lt: dateTo } },
      { orderBy: { createdAt: 'DESC' }, limit },
    );
  }

  /**
   * Streams a CSV of every toot in the requested timeframe (capped) to the
   * provided Express response. Content is stripped to plain text. Mirrors the
   * conventions used by the followers/boosts/replies/favorites exporters.
   */
  async exportCsv(
    account: Loaded<AccountEntity>,
    timeframe: string,
    res: Response,
    customDateFrom?: string,
    customDateTo?: string,
  ): Promise<void> {
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe, {
      dateFrom: customDateFrom,
      dateTo: customDateTo,
    });
    const toots = await this.getTootsForCsv(account.id, dateFrom, dateTo);

    const filenameSuffix =
      timeframe === 'custom' && customDateFrom && customDateTo ? `custom_${customDateFrom}_${customDateTo}` : timeframe;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=top-posts-${account.id}-${filenameSuffix}.csv`);

    const stringifier = stringify({ header: true, delimiter: ';' });
    stringifier.pipe(res);

    stringifier.on('error', (err) => {
      this.logger.error('Error during CSV stringification', err);
      if (!res.headersSent) {
        res.status(500).send('Error generating CSV');
      }
    });

    toots.forEach((toot) => {
      stringifier.write({
        Date: formatDateISO(toot.createdAt, account.timezone) ?? '',
        URL: escapeCsvCell(toot.url),
        Visibility: toot.visibility,
        Language: toot.language,
        Replies: toot.repliesCount,
        Boosts: toot.reblogsCount,
        Favorites: toot.favouritesCount,
        Content: escapeCsvCell(stripHtml(toot.content)),
      });
    });
    stringifier.end();
  }
}
