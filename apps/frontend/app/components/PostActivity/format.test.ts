import { describe, expect, it } from 'vitest';

import { formatBucketLabel, formatBucketTick, formatDay, formatDayRange, formatPostsPerDay } from './format';

describe('PostActivity formatters', () => {
  it('formats calendar days without shifting them by the local timezone', () => {
    expect(formatDay('2026-09-01', 'en')).toBe('Sep 1, 2026');
    expect(formatDay('2026-12-31', 'en')).toBe('Dec 31, 2026');
  });

  it('formats a day range', () => {
    // Intl uses thin spaces around the dash, so normalize whitespace before comparing
    expect(formatDayRange('2026-09-01', '2026-09-30', 'en').replace(/\s/g, ' ')).toBe('Sep 1 – 30, 2026');
    expect(formatDayRange('2026-09-01', '2026-09-01', 'en')).toBe('Sep 1, 2026');
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
