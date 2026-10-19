import type { PostActivityBucket } from '@analytodon/rest-client';

// Days arrive as plain calendar days (YYYY-MM-DD) already resolved in the account's
// timezone, so they are parsed and formatted in UTC to avoid shifting them by the
// viewer's own offset.
const parseDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

const dateFormat = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });

/** e.g. "Sep 1, 2026" */
export const formatDay = (day: string, locale: string): string =>
  dateFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(parseDay(day));

/** e.g. "Sep 1 – 30, 2026" (a single date when both ends are the same day) */
export const formatDayRange = (from: string, to: string, locale: string): string =>
  dateFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(parseDay(from), parseDay(to));

/** Short x-axis tick: "Sep 1" for day/week buckets, "Sep 2026" for month buckets. */
export const formatBucketTick = (day: string, bucket: PostActivityBucket, locale: string): string =>
  bucket === 'month'
    ? dateFormat(locale, { month: 'short', year: 'numeric' }).format(parseDay(day))
    : dateFormat(locale, { month: 'short', day: 'numeric' }).format(parseDay(day));

/** Tooltip label: full date for day/week buckets (week = its first day), "September 2026" for months. */
export const formatBucketLabel = (day: string, bucket: PostActivityBucket, locale: string): string =>
  bucket === 'month'
    ? dateFormat(locale, { month: 'long', year: 'numeric' }).format(parseDay(day))
    : formatDay(day, locale);

/** Average posts per day with at most one decimal, e.g. "1.3" (en-US, like formatNumber). */
export const formatPostsPerDay = (total: number, days: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(days > 0 ? total / days : 0);
