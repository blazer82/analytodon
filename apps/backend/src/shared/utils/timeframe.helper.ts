import { DailyAccountStatsEntity, DailyTootStatsEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/core';
import { BadRequestException, Logger } from '@nestjs/common';
import { parseISO as dateFnsParseISO } from 'date-fns';
import { intlFormat } from 'date-fns/intlFormat';
import { findTimeZone, getUTCOffset } from 'timezone-support';

export type Timeframe =
  | 'thisweek'
  | 'thismonth'
  | 'thisyear'
  | 'lastweek'
  | 'lastmonth'
  | 'lastyear'
  | 'last7days'
  | 'last30days'
  | 'custom';

// Define KPI DTO based on legacy usage
export interface KpiDto {
  currentPeriod?: number;
  currentPeriodProgress?: number;
  previousPeriod?: number;
  isLastPeriod?: boolean;
}

export const getDaysAgo = (days: number, timezone: string): Date => {
  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() - days);

  // Ensure timezone string is valid for Intl.DateTimeFormat
  const validTimezone = timezone.replace(' ', '_');

  const date = new Date(
    Intl.DateTimeFormat('en-CA', {
      // 'en-CA' gives YYYY-MM-DD format
      timeZone: validTimezone,
    }).format(referenceDate),
  );

  // Adjust date to UTC start of day in that timezone
  try {
    const tz = findTimeZone(validTimezone);
    const { offset } = getUTCOffset(
      date, // Use the 'YYYY-MM-DD' UTC midnight date, consistent with legacy for offset calculation
      tz,
    );

    const offsetHours = Math.floor(offset / 60);
    const offsetMinutes = offset % 60;

    // Create a new date object representing the start of the day in the target timezone, then convert to UTC
    const localDate = new Date(referenceDate.toLocaleString('en-US', { timeZone: validTimezone }));
    localDate.setHours(0, 0, 0, 0); // Start of day in local timezone

    // The 'date' object is already YYYY-MM-DD in local time, which JS interprets as UTC if no TZ info.
    // We want it to represent the start of that day in the specified timezone, effectively.
    // The original legacy code was a bit complex here. A simpler way for "start of day X days ago in timezone"
    // is to get current time in timezone, subtract days, then set to midnight.

    const nowInTimezone = new Date(new Date().toLocaleString('en-US', { timeZone: validTimezone }));
    nowInTimezone.setDate(nowInTimezone.getDate() - days);
    nowInTimezone.setHours(0, 0, 0, 0);

    // Convert this "local midnight" back to a true UTC Date object
    // This is tricky because JS Date objects are always UTC internally.
    // The `date` object created with `Intl.DateTimeFormat` is YYYY-MM-DD string parsed as UTC.
    // Let's stick to the logic of the original `date` object and adjust its UTC hours based on offset.
    // This makes `date` represent 00:00:00 UTC on that specific day *as if* it were local time.
    // Then, applying the UTC offset effectively shifts it to be 00:00:00 in the target timezone.

    const finalDate = new Date(date.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    finalDate.setUTCHours(finalDate.getUTCHours() + offsetHours);
    finalDate.setUTCMinutes(finalDate.getUTCMinutes() + offsetMinutes);

    return finalDate;
  } catch (error) {
    new Logger('TimeframeHelper').error(`Error processing timezone ${validTimezone} in getDaysAgo: `, error);
    return date;
  }
};

export const getDaysToWeekBeginning = (timezone: string, weekModifier = 0): number => {
  const validTimezone = timezone.replace(' ', '_');
  const date = new Date(
    Intl.DateTimeFormat('en-CA', {
      timeZone: validTimezone,
    }).format(new Date()),
  );
  // JavaScript getDay(): 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  // We want Monday as the start of the week (day 1).
  // If today is Sunday (0), (0 - 1 + 7) % 7 = 6 days since Monday.
  // If today is Monday (1), (1 - 1 + 7) % 7 = 0 days since Monday.
  // If today is Saturday (6), (6 - 1 + 7) % 7 = 5 days since Monday.
  const daysSinceMonday = (date.getDay() - 1 + 7) % 7;
  return daysSinceMonday - 7 * weekModifier;
};

export const getDaysToMonthBeginning = (timezone: string, monthModifier = 0): number => {
  const validTimezone = timezone.replace(' ', '_');
  const todayInTimezoneStr = Intl.DateTimeFormat('en-CA', { timeZone: validTimezone }).format(new Date());
  const today = new Date(todayInTimezoneStr + 'T00:00:00Z'); // Treat as UTC midnight for calculation simplicity

  const currentMonth = today.getUTCMonth();
  const currentYear = today.getUTCFullYear();

  const targetMonthDate = new Date(Date.UTC(currentYear, currentMonth + monthModifier, 1));

  const diffTime = today.getTime() - targetMonthDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getDaysToYearBeginning = (timezone: string, yearModifier = 0): number => {
  const validTimezone = timezone.replace(' ', '_');
  const todayInTimezoneStr = Intl.DateTimeFormat('en-CA', { timeZone: validTimezone }).format(new Date());
  const today = new Date(todayInTimezoneStr + 'T00:00:00Z'); // Treat as UTC midnight

  const currentYear = today.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(currentYear + yearModifier, 0, 1)); // Month is 0-indexed

  const diffTime = today.getTime() - startOfYear.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const parseDate = (dateStr: string, timezone: string): Date => {
  const validTimezone = timezone.replace(' ', '_');
  const date = new Date(dateStr + 'T00:00:00.000Z');

  try {
    const tz = findTimeZone(validTimezone);
    const { offset } = getUTCOffset(date, tz);

    const offsetHours = Math.floor(offset / 60);
    const offsetMinutes = offset % 60;

    const finalDate = new Date(date.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    finalDate.setUTCHours(finalDate.getUTCHours() + offsetHours);
    finalDate.setUTCMinutes(finalDate.getUTCMinutes() + offsetMinutes);

    return finalDate;
  } catch (error) {
    new Logger('TimeframeHelper').error(`Error processing timezone ${validTimezone} in parseDate: `, error);
    return date;
  }
};

const MAX_CUSTOM_RANGE_DAYS = 366;

export const resolveTimeframe = (
  timezone: string,
  timeframe: string,
  options?: { dateFrom?: string; dateTo?: string },
): { dateFrom: Date; dateTo: Date; timeframe: Timeframe } => {
  const today = getDaysAgo(0, timezone); // Represents start of today in the given timezone
  const tomorrow = getDaysAgo(-1, timezone); // Represents start of tomorrow

  switch (timeframe) {
    case 'thisweek':
      return {
        dateFrom: getDaysAgo(getDaysToWeekBeginning(timezone), timezone),
        dateTo: tomorrow,
        timeframe: 'thisweek',
      };
    case 'thismonth':
      return {
        dateFrom: getDaysAgo(getDaysToMonthBeginning(timezone), timezone),
        dateTo: tomorrow,
        timeframe: 'thismonth',
      };
    case 'thisyear':
      return {
        dateFrom: getDaysAgo(getDaysToYearBeginning(timezone), timezone),
        dateTo: tomorrow,
        timeframe: 'thisyear',
      };
    case 'lastweek': {
      // From Monday of last week to Sunday of last week (end of day)
      // which means start of Monday this week as exclusive end.
      const startOfThisWeek = getDaysAgo(getDaysToWeekBeginning(timezone), timezone);
      const startOfLastWeek = getDaysAgo(getDaysToWeekBeginning(timezone) + 7, timezone);
      return {
        dateFrom: startOfLastWeek,
        dateTo: startOfThisWeek,
        timeframe: 'lastweek',
      };
    }
    case 'lastmonth':
      return {
        dateFrom: getDaysAgo(getDaysToMonthBeginning(timezone, -1), timezone),
        dateTo: getDaysAgo(getDaysToMonthBeginning(timezone, 0), timezone),
        timeframe: 'lastmonth',
      };
    case 'lastyear':
      return {
        dateFrom: getDaysAgo(getDaysToYearBeginning(timezone, -1), timezone),
        dateTo: getDaysAgo(getDaysToYearBeginning(timezone, 0), timezone),
        timeframe: 'lastyear',
      };
    case 'last7days':
      return {
        dateFrom: getDaysAgo(7, timezone), // From start of 7 days ago
        dateTo: today, // To start of today (exclusive end for queries often) or tomorrow for inclusive
        timeframe: 'last7days',
      };
    case 'custom': {
      if (!options?.dateFrom || !options?.dateTo) {
        throw new BadRequestException('dateFrom and dateTo are required for custom timeframe');
      }
      const customFrom = parseDate(options.dateFrom, timezone);
      const customTo = parseDate(options.dateTo, timezone);

      if (customFrom > customTo) {
        throw new BadRequestException('dateFrom must be before or equal to dateTo');
      }

      const rangeDays = Math.round((customTo.getTime() - customFrom.getTime()) / (1000 * 60 * 60 * 24));
      if (rangeDays > MAX_CUSTOM_RANGE_DAYS) {
        throw new BadRequestException(`Custom date range must not exceed ${MAX_CUSTOM_RANGE_DAYS} days`);
      }

      const oneDayAfterTo = new Date(customTo);
      oneDayAfterTo.setUTCDate(oneDayAfterTo.getUTCDate() + 1);

      return {
        dateFrom: customFrom,
        dateTo: oneDayAfterTo,
        timeframe: 'custom',
      };
    }
    default: {
      // last30days
      return {
        dateFrom: getDaysAgo(30, timezone),
        dateTo: tomorrow, // Data up to end of yesterday
        timeframe: 'last30days',
      };
    }
  }
};

// Define specific attribute types for each entity
type DailyTootStatAttributes = 'boostsCount' | 'favouritesCount' | 'repliesCount';
type DailyAccountStatAttributes = 'followersCount' | 'statusesCount';
type StatAttribute = DailyTootStatAttributes | DailyAccountStatAttributes; // Keep original union for implementation

type PeriodFunction = (timezone: string, modifier?: number) => number;

export interface PeriodKPIOptions {
  forceLastPeriod?: boolean;
}

// Overload for DailyTootStatsEntity
export function getPeriodKPI(
  statsRepository: EntityRepository<DailyTootStatsEntity>,
  accountId: string,
  timezone: string,
  periodFunction: PeriodFunction,
  attribute: DailyTootStatAttributes,
  options?: PeriodKPIOptions,
): Promise<KpiDto>;

// Overload for DailyAccountStatsEntity
export function getPeriodKPI(
  statsRepository: EntityRepository<DailyAccountStatsEntity>,
  accountId: string,
  timezone: string,
  periodFunction: PeriodFunction,
  attribute: DailyAccountStatAttributes,
  options?: PeriodKPIOptions,
): Promise<KpiDto>;

// Implementation
export async function getPeriodKPI(
  statsRepository: EntityRepository<DailyTootStatsEntity> | EntityRepository<DailyAccountStatsEntity>,
  accountId: string,
  timezone: string,
  periodFunction: PeriodFunction,
  attribute: StatAttribute,
  options?: PeriodKPIOptions,
): Promise<KpiDto> {
  const isAtPeriodStart = periodFunction(timezone) === 0;
  const periodModifier = options?.forceLastPeriod || isAtPeriodStart ? -1 : 0;
  const daysToPeriodBeginning = periodFunction(timezone, periodModifier);

  const thisPeriodStart = getDaysAgo(daysToPeriodBeginning, timezone);

  const daysToNextPeriodStart = periodFunction(timezone, periodModifier + 1);
  const thisPeriodQueryEnd =
    options?.forceLastPeriod && !isAtPeriodStart
      ? getDaysAgo(daysToNextPeriodStart, timezone)
      : getDaysAgo(0, timezone);

  const lastPeriodStart = getDaysAgo(periodFunction(timezone, periodModifier - 1), timezone);

  const thisPeriodStartStat = await statsRepository.findOne(
    { account: accountId, day: { $lte: thisPeriodStart } },
    { orderBy: { day: 'DESC' } },
  );

  const thisPeriodEndStat = await statsRepository.findOne(
    { account: accountId, day: { $lte: thisPeriodQueryEnd } },
    { orderBy: { day: 'DESC' } },
  );

  const lastPeriodStartStat = await statsRepository.findOne(
    { account: accountId, day: { $lte: lastPeriodStart } },
    { orderBy: { day: 'DESC' } },
  );

  const results: KpiDto = {};

  if (thisPeriodStartStat && thisPeriodEndStat) {
    results.currentPeriod = (thisPeriodEndStat[attribute] as number) - (thisPeriodStartStat[attribute] as number);

    const daysInPeriodIdeal = daysToPeriodBeginning - daysToNextPeriodStart;
    const daysPassed = options?.forceLastPeriod && !isAtPeriodStart ? daysInPeriodIdeal : daysToPeriodBeginning;
    results.currentPeriodProgress = daysPassed / daysInPeriodIdeal;
    results.isLastPeriod = periodModifier !== 0;
  }

  if (lastPeriodStartStat && thisPeriodStartStat) {
    results.previousPeriod = (thisPeriodStartStat[attribute] as number) - (lastPeriodStartStat[attribute] as number);
  }

  return results;
}

export const getKPITrend = (kpi: KpiDto): number | null => {
  // Align with legacy behavior:
  // Legacy `if (!previousPeriod || !currentPeriod || !currentPeriodProgress)` would return undefined (null in JSON)
  // if any of these were undefined or 0.

  if (kpi.previousPeriod === undefined || kpi.currentPeriod === undefined || kpi.currentPeriodProgress === undefined) {
    return null; // Handles undefined inputs
  }

  // Handle cases where legacy would return undefined due to zero values, leading to no trend calculation
  if (kpi.previousPeriod === 0) {
    return null;
  }
  if (kpi.currentPeriod === 0) {
    // In legacy, `!currentPeriod` (if 0) would cause an early exit.
    // If previousPeriod is non-zero, this implies a -100% trend.
    // To strictly match legacy's early exit for `currentPeriod === 0`:
    return null;
  }
  if (kpi.currentPeriodProgress === 0) {
    return null;
  }

  // At this point, all kpi values (previousPeriod, currentPeriod, currentPeriodProgress) are defined and non-zero.
  const projectedCurrentPeriod = kpi.currentPeriod / kpi.currentPeriodProgress;
  return (projectedCurrentPeriod - kpi.previousPeriod) / Math.abs(kpi.previousPeriod);
};

/**
 * Iterates over each calendar day in the [dateFrom, dateTo) range (in the given timezone),
 * yielding one UTC `Date` per local day. The boundary semantics match the rest of the
 * codebase: `resolveTimeframe` returns a `dateTo` that is the exclusive upper bound
 * (i.e. start of the day AFTER the last day to include), so we iterate while
 * `current < dateTo`.
 */
export const eachDayInRange = (dateFrom: Date, dateTo: Date, timezone: string): Date[] => {
  const days: Date[] = [];
  if (dateFrom >= dateTo) return days;

  // Walk one day at a time. We add 24h in UTC; for accounts whose timezone has DST
  // shifts this can drift by an hour, but `formatDateISO(..., timezone)` is what we
  // key off, so we de-dupe on the formatted day string to avoid emitting the same
  // local day twice across a DST transition.
  const seen = new Set<string>();
  const current = new Date(dateFrom);
  // Safety cap matches MAX_CUSTOM_RANGE_DAYS upstream.
  for (let i = 0; i < 400 && current < dateTo; i++) {
    const key = formatDateISO(current, timezone);
    if (key && !seen.has(key)) {
      seen.add(key);
      days.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
};

export const formatDateISO = (date: Date | string | undefined, timezone?: string): string | null => {
  if (!date) return null;
  try {
    const dateObj = typeof date === 'string' ? dateFnsParseISO(date) : date;
    // Format to YYYY-MM-DD using intlFormat to respect timezone
    return intlFormat(
      dateObj,
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timezone?.replace(' ', '_'),
      },
      { locale: 'en-CA' }, // 'en-CA' locale typically gives YYYY-MM-DD format
    );
  } catch (error) {
    new Logger('TimeframeHelper').error('Error formatting date to ISO:', error);
    return null;
  }
};
