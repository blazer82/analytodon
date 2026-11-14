import type { PostActivityBucket } from '@analytodon/rest-client';

// Days arrive as plain calendar days (YYYY-MM-DD) already resolved in the account's
// timezone, so they are parsed and formatted in UTC to avoid shifting them by the
// viewer's own offset.
const parseDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

const dateFormat = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });

const DAY_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

// Languages whose ranges are put together from single dates when Intl only offers a numeric one.
// Deliberately a list: recognising the numeric fallback by its separators alone misfires for other
// languages (e.g. Latvian, Basque, Mongolian, whose ranges legitimately reword a single date).
const COMPOSED_RANGE_LANGUAGES = new Set(['ja', 'zh']);

/** e.g. "Sep 1, 2026" */
export const formatDay = (day: string, locale: string): string => dateFormat(locale, DAY_FORMAT).format(parseDay(day));

/**
 * e.g. "Sep 1 – 30, 2026" (en), "1.–30. Sept. 2026" (de), "2026年9月1日～30日" (ja);
 * a single date when both ends are the same day.
 *
 * Intl's formatRange() is used wherever it keeps the look of a single date. For Japanese and
 * Chinese it falls back to a purely numeric form ("2026/09/01～2026/09/30"), which doesn't match
 * the dates in the rest of the app; the range is then put together from single dates, with the
 * year written once.
 */
export const formatDayRange = (from: string, to: string, locale: string): string => {
  const withYear = dateFormat(locale, DAY_FORMAT);
  const start = parseDay(from);
  const end = parseDay(to);
  if (from === to) return withYear.format(start);

  const rangeParts = withYear.formatRangeToParts(start, end);
  // Node's ICU puts thin spaces around the range dash where browsers use plain ones; use plain
  // spaces everywhere so the server render and the client agree (otherwise hydration fails).
  const range = rangeParts
    .map((part) => part.value)
    .join('')
    .replace(/[\u2009\u202f]/g, ' ');
  if (!COMPOSED_RANGE_LANGUAGES.has(locale.split('-')[0].toLowerCase())) return range;

  // The fallback shows in the separators: those of a single date ("年", "月", "日") are missing from the range
  const dateParts = withYear.formatToParts(start);
  const isFallback = dateParts.some(
    (part) => part.type === 'literal' && part.value.trim() !== '' && !range.includes(part.value.trim()),
  );
  if (!isFallback) return range;

  const separator = rangeParts.find((part) => part.type === 'literal' && part.source === 'shared')?.value ?? ' – ';
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${withYear.format(start)}${separator}${withYear.format(end)}`;
  }
  // Same year: write it once, on the start date where the year comes first, otherwise on the end date.
  // Within one month the month is not repeated either, the way Intl does it for other languages.
  const types = dateParts.map((part) => part.type);
  const yearFirst = types.indexOf('year') < types.indexOf('day');
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const withoutYear = dateFormat(locale, { month: 'short', day: 'numeric' });
  const dayOnly = dateFormat(locale, { day: 'numeric' });
  return yearFirst
    ? `${withYear.format(start)}${separator}${(sameMonth ? dayOnly : withoutYear).format(end)}`
    : `${(sameMonth ? dayOnly : withoutYear).format(start)}${separator}${withYear.format(end)}`;
};

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
