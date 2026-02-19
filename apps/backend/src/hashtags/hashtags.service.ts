import { AccountEntity, HashtagStatsEntity } from '@analytodon/shared-orm';
import { Loaded } from '@mikro-orm/core';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { Injectable, Logger } from '@nestjs/common';

import { resolveTimeframe } from '../shared/utils/timeframe.helper';
import { HashtagEngagementDto } from './dto/hashtag-engagement.dto';
import { HashtagOverTimeDto } from './dto/hashtag-over-time.dto';
import { HashtagTopDto } from './dto/hashtag-top.dto';

@Injectable()
export class HashtagsService {
  private readonly logger = new Logger(HashtagsService.name);

  constructor(private readonly em: EntityManager) {}

  async getTopHashtags(account: Loaded<AccountEntity>, timeframe: string, limit = 10): Promise<HashtagTopDto[]> {
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    const results = await this.em.aggregate(HashtagStatsEntity, [
      {
        $match: {
          account: new ObjectId(account.id),
          day: { $gte: dateFrom, $lt: dateTo },
        },
      },
      {
        $group: {
          _id: '$hashtag',
          tootCount: { $sum: '$tootCount' },
          repliesCount: { $sum: '$repliesCount' },
          reblogsCount: { $sum: '$reblogsCount' },
          favouritesCount: { $sum: '$favouritesCount' },
        },
      },
      { $sort: { tootCount: -1 } },
      { $limit: limit },
    ]);

    return results.map((r) => ({
      hashtag: r._id,
      tootCount: r.tootCount,
      repliesCount: r.repliesCount,
      reblogsCount: r.reblogsCount,
      favouritesCount: r.favouritesCount,
    }));
  }

  async getOverTime(account: Loaded<AccountEntity>, timeframe: string, limit = 10): Promise<HashtagOverTimeDto> {
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    // Get top N hashtag names only
    const topResults = await this.em.aggregate(HashtagStatsEntity, [
      {
        $match: {
          account: new ObjectId(account.id),
          day: { $gte: dateFrom, $lt: dateTo },
        },
      },
      {
        $group: {
          _id: '$hashtag',
          tootCount: { $sum: '$tootCount' },
        },
      },
      { $sort: { tootCount: -1 } },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);

    const hashtagNames = topResults.map((r: { _id: string }) => r._id);

    if (hashtagNames.length === 0) {
      return { hashtags: [], data: [] };
    }

    // Query daily data grouped by day+hashtag
    const dailyData = await this.em.aggregate(HashtagStatsEntity, [
      {
        $match: {
          account: new ObjectId(account.id),
          day: { $gte: dateFrom, $lt: dateTo },
          hashtag: { $in: hashtagNames },
        },
      },
      {
        $group: {
          _id: { day: '$day', hashtag: '$hashtag' },
          tootCount: { $sum: '$tootCount' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    // Pivot into { day, [hashtag]: tootCount } format
    const dayMap = new Map<string, Record<string, string | number>>();

    for (const entry of dailyData) {
      const dayStr = entry._id.day.toISOString().split('T')[0];
      if (!dayMap.has(dayStr)) {
        const row: Record<string, string | number> = { day: dayStr };
        for (const tag of hashtagNames) {
          row[tag] = 0;
        }
        dayMap.set(dayStr, row);
      }
      const row = dayMap.get(dayStr)!;
      row[entry._id.hashtag] = (row[entry._id.hashtag] as number) + entry.tootCount;
    }

    return {
      hashtags: hashtagNames,
      data: Array.from(dayMap.values()),
    };
  }

  async getEngagement(account: Loaded<AccountEntity>, timeframe: string, limit = 10): Promise<HashtagEngagementDto[]> {
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    const results = await this.em.aggregate(HashtagStatsEntity, [
      {
        $match: {
          account: new ObjectId(account.id),
          day: { $gte: dateFrom, $lt: dateTo },
        },
      },
      {
        $group: {
          _id: '$hashtag',
          tootCount: { $sum: '$tootCount' },
          repliesCount: { $sum: '$repliesCount' },
          reblogsCount: { $sum: '$reblogsCount' },
          favouritesCount: { $sum: '$favouritesCount' },
        },
      },
      {
        $addFields: {
          totalEngagement: { $add: ['$repliesCount', '$reblogsCount', '$favouritesCount'] },
          avgEngagementPerToot: {
            $cond: {
              if: { $gt: ['$tootCount', 0] },
              then: {
                $divide: [{ $add: ['$repliesCount', '$reblogsCount', '$favouritesCount'] }, '$tootCount'],
              },
              else: 0,
            },
          },
        },
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: limit },
    ]);

    return results.map((r) => ({
      hashtag: r._id,
      tootCount: r.tootCount,
      totalEngagement: r.totalEngagement,
      avgEngagementPerToot: Math.round(r.avgEngagementPerToot * 100) / 100,
      repliesCount: r.repliesCount,
      reblogsCount: r.reblogsCount,
      favouritesCount: r.favouritesCount,
    }));
  }

  async getMostEffective(
    account: Loaded<AccountEntity>,
    timeframe: string,
    limit = 10,
    minTootCount = 2,
  ): Promise<HashtagEngagementDto[]> {
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    const results = await this.em.aggregate(HashtagStatsEntity, [
      {
        $match: {
          account: new ObjectId(account.id),
          day: { $gte: dateFrom, $lt: dateTo },
        },
      },
      {
        $group: {
          _id: '$hashtag',
          tootCount: { $sum: '$tootCount' },
          repliesCount: { $sum: '$repliesCount' },
          reblogsCount: { $sum: '$reblogsCount' },
          favouritesCount: { $sum: '$favouritesCount' },
        },
      },
      {
        $match: {
          tootCount: { $gte: minTootCount },
        },
      },
      {
        $addFields: {
          totalEngagement: { $add: ['$repliesCount', '$reblogsCount', '$favouritesCount'] },
          avgEngagementPerToot: {
            $cond: {
              if: { $gt: ['$tootCount', 0] },
              then: {
                $divide: [{ $add: ['$repliesCount', '$reblogsCount', '$favouritesCount'] }, '$tootCount'],
              },
              else: 0,
            },
          },
        },
      },
      { $sort: { avgEngagementPerToot: -1 } },
      { $limit: limit },
    ]);

    return results.map((r) => ({
      hashtag: r._id,
      tootCount: r.tootCount,
      totalEngagement: r.totalEngagement,
      avgEngagementPerToot: Math.round(r.avgEngagementPerToot * 100) / 100,
      repliesCount: r.repliesCount,
      reblogsCount: r.reblogsCount,
      favouritesCount: r.favouritesCount,
    }));
  }
}
