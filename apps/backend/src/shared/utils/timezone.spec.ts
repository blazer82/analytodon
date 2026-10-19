import { FALLBACK_TIMEZONE, resolveTimezone } from './timezone';

describe('resolveTimezone', () => {
  it('returns valid IANA timezones unchanged', () => {
    expect(resolveTimezone('Europe/Berlin')).toBe('Europe/Berlin');
    expect(resolveTimezone('UTC')).toBe('UTC');
  });

  it('replaces spaces with underscores', () => {
    expect(resolveTimezone('America/New York')).toBe('America/New_York');
  });

  it('falls back to UTC for missing timezones', () => {
    expect(resolveTimezone(undefined)).toBe(FALLBACK_TIMEZONE);
    expect(resolveTimezone(null)).toBe(FALLBACK_TIMEZONE);
    expect(resolveTimezone('')).toBe(FALLBACK_TIMEZONE);
    expect(resolveTimezone('   ')).toBe(FALLBACK_TIMEZONE);
  });

  it('falls back to UTC for unknown timezones', () => {
    expect(resolveTimezone('Mars/Olympus_Mons')).toBe(FALLBACK_TIMEZONE);
  });
});
