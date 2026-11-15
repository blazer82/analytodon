import { describe, expect, it } from 'vitest';

import { formatBucketLabel, formatBucketTick, formatDay, formatDayRange, formatPostsPerDay } from './format';

describe('PostActivity formatters', () => {
  it('formats calendar days without shifting them by the local timezone', () => {
    expect(formatDay('2026-09-01', 'en')).toBe('Sep 1, 2026');
    expect(formatDay('2026-12-31', 'en')).toBe('Dec 31, 2026');
  });

  it('uses plain spaces around the range dash so server and browser render the same text', () => {
    expect(formatDayRange('2026-10-16', '2026-11-15', 'en')).toBe('Oct 16 – Nov 15, 2026');
    expect(formatDayRange('2026-10-16', '2026-11-15', 'de')).toBe('16. Okt. – 15. Nov. 2026');
  });

  it('formats a day range', () => {
    // Intl uses thin spaces around the dash, so normalize whitespace before comparing
    expect(formatDayRange('2026-09-01', '2026-09-30', 'en').replace(/\s/g, ' ')).toBe('Sep 1 – 30, 2026');
    expect(formatDayRange('2026-09-01', '2026-09-01', 'en')).toBe('Sep 1, 2026');
  });

  // Intl uses thin/narrow spaces around the dash, so normalize whitespace before comparing
  const range = (from: string, to: string, locale: string) => formatDayRange(from, to, locale).replace(/\s/g, ' ');

  it('keeps the Intl range format in English and German', () => {
    expect(range('2026-10-16', '2026-11-15', 'en')).toBe('Oct 16 – Nov 15, 2026');
    expect(range('2026-12-28', '2027-01-03', 'en')).toBe('Dec 28, 2026 – Jan 3, 2027');
    expect(range('2026-09-01', '2026-09-30', 'de')).toBe('1.–30. Sept. 2026');
    expect(range('2026-10-16', '2026-11-15', 'de')).toBe('16. Okt. – 15. Nov. 2026');
    expect(range('2026-12-28', '2027-01-03', 'de')).toBe('28. Dez. 2026 – 3. Jan. 2027');
    expect(range('2026-09-01', '2026-09-01', 'de')).toBe('1. Sept. 2026');
    for (const locale of ['en', 'de']) {
      for (const [from, to] of [
        ['2026-09-01', '2026-09-30'],
        ['2026-10-16', '2026-11-15'],
        ['2026-12-28', '2027-01-03'],
        ['2026-09-01', '2026-09-01'],
      ]) {
        const intl = new Intl.DateTimeFormat(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
        expect(formatDayRange(from, to, locale)).toBe(
          intl
            .formatRange(new Date(`${from}T00:00:00.000Z`), new Date(`${to}T00:00:00.000Z`))
            .replace(/[\u2009\u202f]/g, ' '),
        );
      }
    }
  });

  it('writes Japanese ranges like single dates instead of the numeric Intl fallback', () => {
    expect(formatDayRange('2026-10-16', '2026-11-15', 'ja')).toBe('2026年10月16日～11月15日');
    expect(formatDayRange('2026-09-01', '2026-09-30', 'ja')).toBe('2026年9月1日～30日');
    expect(formatDayRange('2026-12-28', '2027-01-03', 'ja')).toBe('2026年12月28日～2027年1月3日');
    expect(formatDayRange('2026-11-15', '2026-11-15', 'ja')).toBe('2026年11月15日');
    expect(formatDay('2026-11-15', 'ja')).toBe('2026年11月15日');
  });

  it('leaves the ranges of all other languages to Intl', () => {
    // Languages whose Intl range rewords a single date (so its separators differ) must not be recomposed
    for (const locale of ['lv', 'eu', 'mn', 'ca', 'he', 'fr', 'ko', 'en-GB', 'de-CH']) {
      for (const [from, to] of [
        ['2026-09-01', '2026-09-30'],
        ['2026-10-16', '2026-11-15'],
        ['2026-12-28', '2027-01-03'],
      ]) {
        const intl = new Intl.DateTimeFormat(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
        expect(formatDayRange(from, to, locale)).toBe(
          intl
            .formatRange(new Date(`${from}T00:00:00.000Z`), new Date(`${to}T00:00:00.000Z`))
            .replace(/[\u2009\u202f]/g, ' '),
        );
      }
    }
  });

  it('keeps Japanese month ticks and labels year-first', () => {
    expect(formatBucketTick('2026-09-01', 'month', 'ja')).toBe('2026年9月');
    expect(formatBucketLabel('2026-09-01', 'month', 'ja')).toBe('2026年9月');
    expect(formatBucketTick('2026-09-07', 'day', 'ja')).toBe('9月7日');
  });

  it('formats ticks per bucket size', () => {
    expect(formatBucketTick('2026-09-07', 'day', 'en')).toBe('Sep 7');
    expect(formatBucketTick('2026-09-07', 'week', 'en')).toBe('Sep 7');
    expect(formatBucketTick('2026-09-01', 'month', 'en')).toBe('Sep 2026');
  });

  it('formats tooltip labels per bucket size', () => {
    expect(formatBucketLabel('2026-09-07', 'day', 'en')).toBe('Sep 7, 2026');
    expect(formatBucketLabel('2026-09-07', 'week', 'en')).toBe('Sep 7, 2026');
    expect(formatBucketLabel('2026-09-01', 'month', 'en')).toBe('September 2026');
    expect(formatBucketLabel('2026-09-01', 'month', 'de')).toBe('September 2026');
  });

  it('formats posts per day with at most one decimal, like formatNumber (en-US)', () => {
    expect(formatPostsPerDay(40, 30)).toBe('1.3');
    expect(formatPostsPerDay(14, 7)).toBe('2');
    expect(formatPostsPerDay(12345, 1)).toBe('12,345');
    expect(formatPostsPerDay(0, 0)).toBe('0');
  });
});
