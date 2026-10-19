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
import { resolveTimezone } from '../shared/utils/timezone';
import { GetTopTootsOptions, TootRankingEnum } from './dto/get-top-toots-query.dto';
import { PostActivityBucketEnum, PostActivityDto } from './dto/post-activity.dto';
import { PostingTimeSlotDto, PostingTimesResponseDto } from './dto/posting-times-response.dto';

export type RankedTootEntity = TootEntity & { rank: number };

export const TOP_POSTS_CSV_MAX_ROWS = 5000;

/** Periods of up to this many days are charted per day (covers every preset up to a quarter). */
export const POST_ACTIVITY_DAILY_MAX_DAYS = 93;
/** Periods of up to this many days (about half a year) are charted per week; longer ones per month. */
export const POST_ACTIVITY_WEEKLY_MAX_DAYS = 186;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetPostActivityOptions {
  accountId: string;
  timezone: string;
  dateFrom: Date;
  dateTo: Date;
}

/** Chooses the chart bucket size for a period of the given length in days. */
export const pickPostActivityBucket = (days: number): PostActivityBucketEnum => {
  if (days <= POST_ACTIVITY_DAILY_MAX_DAYS) return PostActivityBucketEnum.DAY;
  if (days <= POST_ACTIVITY_WEEKLY_MAX_DAYS) return PostActivityBucketEnum.WEEK;
  return PostActivityBucketEnum.MONTH;
};

/**
 * Same normalization as resolveTimeframe (which has already rejected unknown timezones
 * by the time we get here), so the Mongo grouping and the timeframe bounds agree.
 */
const normalizeTimezone = (timezone: string): string => timezone.replace(' ', '_');

/** Calendar day (YYYY-MM-DD) of the given instant in the given timezone. */
const toLocalDay = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    date,
  );

/** Pure calendar arithmetic on YYYY-MM-DD strings (no timezone involved). */
const addDays = (day: string, amount: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + amount * DAY_MS).toISOString().slice(0, 10);

/** Number of calendar days from `from` to `to` (YYYY-MM-DD). */
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);

/** UTC offset (local minus UTC, in ms) of the given timezone at the given instant. */
const timezoneOffsetMs = (instant: number, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const localAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return localAsUtc - Math.floor(instant / 1000) * 1000;
};

/** Instant of local midnight at the start of the given calendar day in the given timezone. */
const localDayStart = (day: string, timezone: string): Date => {
  const midnightAsUtc = Date.parse(`${day}T00:00:00.000Z`);
  const firstGuess = midnightAsUtc - timezoneOffsetMs(midnightAsUtc, timezone);
  // Re-evaluate the offset at the guessed instant so days with a DST switch resolve correctly
  return new Date(midnightAsUtc - timezoneOffsetMs(firstGuess, timezone));
};

/** First day of the bucket (Monday-based weeks, calendar months) that contains the given day. */
const bucketStart = (day: string, bucket: PostActivityBucketEnum): string => {
  switch (bucket) {
    case PostActivityBucketEnum.MONTH:
      return `${day.slice(0, 7)}-01`;
    case PostActivityBucketEnum.WEEK: {
      const daysSinceMonday = (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7;
      return addDays(day, -daysSinceMonday);
    }
    default:
      return day;
  }
};

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
   * Counts the account's posts in the [dateFrom, dateTo) window and buckets them by
   * calendar day in the account's timezone. The chart is zero-filled and bucketed per
   * day, week or month depending on the period length (see POST_ACTIVITY_DAILY_MAX_DAYS /
   * POST_ACTIVITY_WEEKLY_MAX_DAYS); a partial first week/month bucket is labelled with
   * the period's first day. The trend compares against the immediately preceding period
   * with the same number of days, cut off at the same elapsed time while the current
   * period is still in progress.
   *
   * "Posts" are the toots Analytodon stores: the account's own public and unlisted
   * statuses including its replies, excluding boosts.
   */
  async getPostActivity(options: GetPostActivityOptions): Promise<PostActivityDto> {
    const { accountId, dateFrom, dateTo } = options;
    const timezone = normalizeTimezone(options.timezone);

    const days: string[] = [];
    if (dateFrom < dateTo) {
      const lastDay = toLocalDay(new Date(dateTo.getTime() - 1), timezone);
      for (let day = toLocalDay(dateFrom, timezone); day <= lastDay; day = addDays(day, 1)) {
        days.push(day);
      }
    }

    // The previous period has the same number of calendar days (in the account's timezone,
    // so DST shifts don't move its start). For a period that is still in progress, only the
    // part of the previous period up to the same point in time is compared, like-for-like.
    const now = new Date();
    const inProgress = dateFrom < now && now < dateTo;
    let previousDateFrom = dateFrom;
    let previousDateTo = dateFrom;
    if (days.length > 0) {
      const previousFirstDay = addDays(days[0], -days.length);
      previousDateFrom = localDayStart(previousFirstDay, timezone);
      if (inProgress) {
        const today = toLocalDay(now, timezone);
        const elapsedSinceMidnight = now.getTime() - localDayStart(today, timezone).getTime();
        const comparableDay = addDays(previousFirstDay, daysBetween(days[0], today));
        previousDateTo = new Date(
          Math.min(localDayStart(comparableDay, timezone).getTime() + elapsedSinceMidnight, dateFrom.getTime()),
        );
      }
    }

    const [dailyCounts, previousPeriodTotal] = await Promise.all([
      this.em.aggregate(TootEntity, [
        { $match: { account: new ObjectId(accountId), createdAt: { $gte: dateFrom, $lt: dateTo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone } },
            count: { $sum: 1 },
          },
        },
      ]) as Promise<{ _id: string; count: number }[]>,
      this.tootRepository.count({ account: accountId, createdAt: { $gte: previousDateFrom, $lt: previousDateTo } }),
    ]);

    const countsByDay = new Map(dailyCounts.map(({ _id, count }) => [_id, count]));
    const bucket = pickPostActivityBucket(days.length);
    const buckets = new Map<string, number>();
    let total = 0;
    let daysWithoutPosts = 0;
    let busiestDay: PostActivityDto['busiestDay'] = null;

    for (const day of days) {
      const count = countsByDay.get(day) ?? 0;
      const key = bucketStart(day, bucket) < days[0] ? days[0] : bucketStart(day, bucket);
      buckets.set(key, (buckets.get(key) ?? 0) + count);
      total += count;
      if (count === 0) daysWithoutPosts++;
      if (count > 0 && (!busiestDay || count > busiestDay.count)) busiestDay = { date: day, count };
    }

    // Posts can't lie in the future, so for an in-progress period `total` already is the
    // count up to now and compares like-for-like with `previousPeriodTotal`.
    return {
      total,
      previousPeriodTotal,
      inProgress,
      trend: previousPeriodTotal > 0 ? (total - previousPeriodTotal) / previousPeriodTotal : null,
      bucket,
      chart: Array.from(buckets, ([time, value]) => ({ time, value })),
      dateFrom: days[0] ?? toLocalDay(dateFrom, timezone),
      dateTo: days[days.length - 1] ?? toLocalDay(dateFrom, timezone),
      days: days.length,
      daysWithoutPosts,
      busiestDay,
    };
  }

  /**
   * Aggregates the account's posts in the requested timeframe by the weekday and
   * hour they were published (in the account's timezone), summing the number of
   * posts and their engagement (replies + boosts + favorites). Only slots with at
   * least one post are returned, so the result has at most 7 * 24 = 168 entries.
   */
  async getPostingTimes(
    account: Loaded<AccountEntity>,
    timeframe: string,
    customDateFrom?: string,
    customDateTo?: string,
  ): Promise<PostingTimesResponseDto> {
    const timezone = resolveTimezone(account.timezone);
    const {
      dateFrom,
      dateTo,
      timeframe: resolvedTimeframe,
    } = resolveTimeframe(timezone, timeframe, {
      dateFrom: customDateFrom,
      dateTo: customDateTo,
    });

    const pipeline: object[] = [
      {
        $match: {
          account: new ObjectId(account.id),
          createdAt: { $gte: dateFrom, $lt: dateTo },
        },
      },
      {
        $group: {
          _id: {
            weekday: { $isoDayOfWeek: { date: '$createdAt', timezone } },
            hour: { $hour: { date: '$createdAt', timezone } },
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
    ];

    const results: { _id: { weekday: number; hour: number }; posts: number; engagement: number }[] =
      await this.em.aggregate(TootEntity, pipeline);

    const data: PostingTimeSlotDto[] = results.map((entry) => ({
      weekday: entry._id.weekday,
      hour: entry._id.hour,
      posts: entry.posts,
      engagement: entry.engagement,
    }));

    return { data, timezone, timeframe: resolvedTimeframe };
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
   * Streams a CSV of toots in the requested timeframe to the provided Express
   * response — one row per toot, newest first, capped at TOP_POSTS_CSV_MAX_ROWS.
   * Content is stripped to plain text and CSV-injection-escaped. Shares the
   * streaming/error/headers plumbing with the other CSV exporters; the per-toot
   * row shape (and the row cap) are specific to this endpoint.
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
