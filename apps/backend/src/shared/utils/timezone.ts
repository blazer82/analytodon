export const FALLBACK_TIMEZONE = 'UTC';

/**
 * Normalizes a stored account timezone (some legacy values use spaces instead of
 * underscores, e.g. "America/New York") and verifies it's a timezone the runtime
 * knows. Falls back to UTC for missing or unknown values so that callers that pass
 * the timezone on to MongoDB date operators don't make the aggregation fail.
 */
export const resolveTimezone = (timezone: string | null | undefined): string => {
  const normalized = timezone?.trim().replace(/ /g, '_');
  if (!normalized) {
    return FALLBACK_TIMEZONE;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized });
    return normalized;
  } catch {
    return FALLBACK_TIMEZONE;
  }
};
