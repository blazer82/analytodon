import { formatDateRange } from './format-date-range';

describe('formatDateRange', () => {
  // Monday to Sunday in Asia/Tokyo
  const from = new Date('2026-11-01T15:00:00Z');
  const to = new Date('2026-11-08T14:59:59Z');

  it('puts the year on the end date for English and German', () => {
    expect(formatDateRange(from, to, 'en', 'Asia/Tokyo')).toBe('Nov 2 – Nov 8, 2026');
    expect(formatDateRange(from, to, 'de', 'Asia/Tokyo')).toBe('2. Nov. – 8. Nov. 2026');
  });

  it('puts the year on the start date for Japanese', () => {
    expect(formatDateRange(from, to, 'ja', 'Asia/Tokyo')).toBe('2026年11月2日～11月8日');
  });

  it('resolves the days in the given timezone', () => {
    expect(formatDateRange(from, to, 'en', 'UTC')).toBe('Nov 1 – Nov 8, 2026');
  });
});
