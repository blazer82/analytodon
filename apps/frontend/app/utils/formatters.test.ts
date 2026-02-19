import { describe, expect, it } from 'vitest';

import { formatDate, formatNumber, shortenToot } from './formatters';

describe('formatDate', () => {
  it('should format a Date object', () => {
    const date = new Date('2025-04-24T12:00:00Z');
    expect(formatDate(date)).toBe('Apr 24, 2025');
  });

  it('should format an ISO string', () => {
    expect(formatDate('2025-01-15T00:00:00Z')).toBe('Jan 15, 2025');
  });

  it('should default to UTC when no timezone provided', () => {
    // 11pm UTC on Jan 15 is still Jan 15 in UTC
    expect(formatDate('2025-01-15T23:00:00Z')).toBe('Jan 15, 2025');
  });

  it('should apply timezone when provided', () => {
    // Midnight UTC on Jan 16 is still Jan 15 in US Pacific (UTC-8)
    expect(formatDate('2025-01-16T00:00:00Z', 'America/Los_Angeles')).toBe('Jan 15, 2025');
  });

  it('should apply timezone that rolls the date forward', () => {
    // 11pm UTC on Jan 15 is Jan 16 in Tokyo (UTC+9)
    expect(formatDate('2025-01-15T23:00:00Z', 'Asia/Tokyo')).toBe('Jan 16, 2025');
  });

  it('should replace spaces with underscores in timezone names', () => {
    // "America/New York" (with space) should be handled as "America/New_York"
    expect(formatDate('2025-07-04T12:00:00Z', 'America/New York')).toBe('Jul 04, 2025');
  });
});

describe('formatNumber', () => {
  it('should format an integer with thousands separators', () => {
    expect(formatNumber(12345)).toBe('12,345');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should return "0" for null', () => {
    expect(formatNumber(null as unknown as number)).toBe('0');
  });

  it('should return "0" for undefined', () => {
    expect(formatNumber(undefined as unknown as number)).toBe('0');
  });

  it('should format negative numbers', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('should format decimal numbers', () => {
    expect(formatNumber(12345.67)).toBe('12,345.67');
  });

  it('should format large numbers', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

describe('shortenToot', () => {
  it('should return short content unchanged', () => {
    expect(shortenToot('Hello world')).toBe('Hello world');
  });

  it('should strip HTML tags', () => {
    expect(shortenToot('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('should truncate long content with ellipsis', () => {
    const long = 'A'.repeat(200);
    const result = shortenToot(long);
    expect(result).toHaveLength(95);
    expect(result.endsWith('…')).toBe(true);
  });

  it('should respect custom length parameter', () => {
    const long = 'A'.repeat(50);
    const result = shortenToot(long, 20);
    expect(result).toHaveLength(20);
    expect(result).toBe('A'.repeat(19) + '…');
  });

  it('should not truncate content exactly at the limit', () => {
    const exact = 'A'.repeat(95);
    expect(shortenToot(exact)).toBe(exact);
  });

  it('should strip nested HTML then truncate', () => {
    const nested = '<div><p>' + 'B'.repeat(200) + '</p></div>';
    const result = shortenToot(nested);
    expect(result).toHaveLength(95);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('<');
  });

  it('should return empty string for empty input', () => {
    expect(shortenToot('')).toBe('');
  });

  it('should return empty string for HTML-only content', () => {
    expect(shortenToot('<br><hr><img src="x">')).toBe('');
  });
});
