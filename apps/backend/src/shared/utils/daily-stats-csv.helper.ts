import { AccountEntity, DailyAccountStatsEntity, DailyTootStatsEntity } from '@analytodon/shared-orm';
import { EntityRepository, FilterQuery, FindOptions, Loaded } from '@mikro-orm/core';

import { eachDayInRange, formatDateISO, resolveTimeframe } from './timeframe.helper';

export interface DailyStatsCsvRow {
  day: string;
  absolute: number;
  delta: number | null;
}

/** Pure-shape input — callers reduce their concrete entities down to this. */
export interface DailyStatPoint {
  day: Date;
  value: number;
}

/**
 * Turns a sparse list of daily stats into a continuous day-by-day CSV series.
 *
 * Background: `DailyTootStatsEntity` and `DailyAccountStatsEntity` only persist rows
 * for days with activity, so the source list has gaps. We carry the previous absolute
 * forward across gap days and emit a delta of 0 for them. The first in-range day's
 * delta is `null` only when no prior data point exists (no seed row, no earlier
 * in-range row).
 *
 * The caller is expected to have queried with `day` between (dateFrom − 1 day) and
 * dateTo so the seed-day row is available to compute the first delta.
 *
 * `dateTo` is exclusive (start of the day AFTER the last day to include) — matches
 * what `resolveTimeframe` returns elsewhere in the codebase.
 */
export function buildDailyStatsCsvRows(
  points: DailyStatPoint[],
  dateFrom: Date,
  dateTo: Date,
  timezone: string,
): DailyStatsCsvRow[] {
  const oneDayEarlier = new Date(dateFrom);
  oneDayEarlier.setUTCDate(oneDayEarlier.getUTCDate() - 1);

  const byDay = new Map<string, number>();
  for (const point of points) {
    const key = formatDateISO(point.day, timezone);
    if (key) byDay.set(key, point.value);
  }

  const seedKey = formatDateISO(oneDayEarlier, timezone);
  const seedValue = seedKey ? byDay.get(seedKey) : undefined;
  let previous: number | undefined = seedValue;
  let carry = seedValue ?? 0;
  let seenAny = seedValue !== undefined;

  const rows: DailyStatsCsvRow[] = [];
  for (const day of eachDayInRange(dateFrom, dateTo, timezone)) {
    const key = formatDateISO(day, timezone);
    if (!key) continue;
    if (byDay.has(key)) {
      carry = byDay.get(key)!;
      seenAny = true;
    }
    const absolute = seenAny ? carry : 0;
    const delta = previous === undefined ? null : absolute - previous;
    rows.push({ day: key, absolute, delta });
    if (seenAny) previous = absolute;
  }
  return rows;
}

/**
 * Repository-aware wrapper that resolves the timeframe, queries the seed-day-extended
 * window, projects each entity to a numeric value via `valueAccessor`, and returns
 * the continuous CSV row series. Used by the boosts/favorites/replies/followers
 * services to avoid four near-identical copies of the same fetch-then-build sequence.
 */
export async function getDailyStatsCsvRows<T extends DailyTootStatsEntity | DailyAccountStatsEntity>(
  repo: EntityRepository<T>,
  account: Loaded<AccountEntity>,
  timeframe: string,
  valueAccessor: (entry: T) => number,
  opts?: { customDateFrom?: string; customDateTo?: string },
): Promise<DailyStatsCsvRow[]> {
  const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe, {
    dateFrom: opts?.customDateFrom,
    dateTo: opts?.customDateTo,
  });
  const oneDayEarlier = new Date(dateFrom);
  oneDayEarlier.setUTCDate(oneDayEarlier.getUTCDate() - 1);

  const entries = await repo.find(
    { account: account.id, day: { $gte: oneDayEarlier, $lt: dateTo } } as FilterQuery<T>,
    { orderBy: { day: 'ASC' } } as FindOptions<T>,
  );

  return buildDailyStatsCsvRows(
    entries.map((e) => ({ day: e.day, value: valueAccessor(e) })),
    dateFrom,
    dateTo,
    account.timezone,
  );
}
