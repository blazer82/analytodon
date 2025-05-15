import { EntityRepository } from '@mikro-orm/core';
import { parseISO as dateFnsParseISO } from 'date-fns';
import { intlFormat } from 'date-fns/intlFormat';
import { findTimeZone, getUTCOffset } from 'timezone-support';

import { DailyAccountStatsEntity } from '../../followers/entities/daily-account-stats.entity'; // Assuming this path is correct
import { DailyTootStatsEntity } from '../../toots/entities/daily-toot-stats.entity'; // Assuming this path is correct

// Define Timeframe type based on legacy usage
export type Timeframe =
  | 'thisweek'
  | 'thismonth'
  | 'thisyear'
  | 'lastweek'
  | 'lastmonth'
  | 'lastyear'
  | 'last7days'
  | 'last30days'; // Default

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
      new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()),
      tz,
    ); // Use start of day for consistent offset

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

    const finalDate = new Date(date.toISOString().slice(0, 10) + 'T00:00:00.000Z'); // Ensure it's UTC midnight
    finalDate.setUTCHours(finalDate.getUTCHours() - offsetHours); // Adjust for timezone offset to get true UTC time for local midnight
    finalDate.setUTCMinutes(finalDate.getUTCMinutes() - offsetMinutes);

    return finalDate;
  } catch (error) {
    console.error(`Error processing timezone ${validTimezone} in getDaysAgo: `, error);
    // Fallback or rethrow, for now, return the unadjusted date
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

export const resolveTimeframe = (
  timezone: string,
  timeframe: string,
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
type DailyAccountStatAttributes = 'followersCount';
type StatAttribute = DailyTootStatAttributes | DailyAccountStatAttributes; // Keep original union for implementation

type PeriodFunction = (timezone: string, modifier?: number) => number;

// Overload for DailyTootStatsEntity
export function getPeriodKPI(
  statsRepository: EntityRepository<DailyTootStatsEntity>,
  accountId: string,
  timezone: string,
  periodFunction: PeriodFunction,
  attribute: DailyTootStatAttributes,
): Promise<KpiDto>;

// Overload for DailyAccountStatsEntity
export function getPeriodKPI(
  statsRepository: EntityRepository<DailyAccountStatsEntity>,
  accountId: string,
  timezone: string,
  periodFunction: PeriodFunction,
  attribute: DailyAccountStatAttributes,
): Promise<KpiDto>;

// Implementation
export async function getPeriodKPI(
  statsRepository: EntityRepository<DailyTootStatsEntity> | EntityRepository<DailyAccountStatsEntity>,
  accountId: string,
  timezone: string,
  periodFunction: PeriodFunction,
  attribute: StatAttribute,
): Promise<KpiDto> {
  const periodModifier = periodFunction(timezone) === 0 ? -1 : 0;
  const daysToPeriodBeginning = periodFunction(timezone, periodModifier);

  // Dates for querying
  const thisPeriodStart = getDaysAgo(daysToPeriodBeginning, timezone);
  // For 'currentPeriod' calculation, we need the value at the very end of the period (or start of next day)
  // and value at the start of the period.
  // The legacy code used `getDaysAgo(1, timezone)` for `thisPeriodEnd` which is start of yesterday.
  // This implies the period ends at the end of yesterday.
  const thisPeriodQueryEnd = getDaysAgo(0, timezone); // Start of today, so data up to end of yesterday.

  const lastPeriodStart = getDaysAgo(periodFunction(timezone, periodModifier - 1), timezone);

  // Find the stats entry closest to the start of "thisPeriodStart" (or one day before)
  const thisPeriodStartStat = await statsRepository.findOne(
    { account: accountId, day: { $lte: thisPeriodStart } },
    { orderBy: { day: 'DESC' } },
  );

  // Find the stats entry closest to the end of "thisPeriodStart" (i.e. start of today)
  const thisPeriodEndStat = await statsRepository.findOne(
    { account: accountId, day: { $lte: thisPeriodQueryEnd } },
    { orderBy: { day: 'DESC' } },
  );

  // Find the stats entry closest to the start of "lastPeriodStart" (or one day before)
  const lastPeriodStartStat = await statsRepository.findOne(
    { account: accountId, day: { $lte: lastPeriodStart } },
    { orderBy: { day: 'DESC' } },
  );

  const results: KpiDto = {};

  if (thisPeriodStartStat && thisPeriodEndStat) {
    results.currentPeriod = (thisPeriodEndStat[attribute] as number) - (thisPeriodStartStat[attribute] as number);

    const daysInPeriodIdeal = daysToPeriodBeginning - periodFunction(timezone, periodModifier + 1);
    // Progress: how many days of the current period have passed, out of total expected days.
    // If daysToPeriodBeginning is 0 (today is start of period), progress is 0.
    // If periodFunction(timezone, periodModifier + 1) is e.g. -7 (for a week), then daysInPeriodIdeal = 7
    // daysPassed = daysToPeriodBeginning - 0 (if period ends today)
    const daysPassed = daysToPeriodBeginning - 0; // Assuming period ends "now" or "end of yesterday"
    results.currentPeriodProgress = daysInPeriodIdeal > 0 ? Math.min(1, daysPassed / daysInPeriodIdeal) : 1;
    results.isLastPeriod = periodModifier !== 0;
  }

  if (lastPeriodStartStat && thisPeriodStartStat) {
    // Previous period is from lastPeriodStartStat to thisPeriodStartStat
    results.previousPeriod = (thisPeriodStartStat[attribute] as number) - (lastPeriodStartStat[attribute] as number);
  }

  // Ensure values are non-negative
  if (results.currentPeriod !== undefined) results.currentPeriod = Math.max(0, results.currentPeriod);
  if (results.previousPeriod !== undefined) results.previousPeriod = Math.max(0, results.previousPeriod);

  return results;
}

export const getKPITrend = (kpi: KpiDto): number | undefined => {
  if (kpi.previousPeriod === undefined || kpi.currentPeriod === undefined || kpi.currentPeriodProgress === undefined) {
    return undefined;
  }
  if (kpi.previousPeriod === 0) {
    return kpi.currentPeriod > 0 ? Infinity : 0; // Or handle as per requirements
  }
  // Adjust current period value based on progress for a fair comparison
  const projectedCurrentPeriod =
    kpi.currentPeriodProgress > 0 ? kpi.currentPeriod / kpi.currentPeriodProgress : kpi.currentPeriod;
  return (projectedCurrentPeriod - kpi.previousPeriod) / kpi.previousPeriod;
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
    console.error('Error formatting date to ISO:', error);
    return null;
  }
};
