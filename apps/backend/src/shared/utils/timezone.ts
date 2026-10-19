export const FALLBACK_TIMEZONE = 'UTC';

/**
 * Normalizes a stored account timezone (some legacy values use spaces instead of
 * underscores, e.g. "America/New York"), fixes its capitalization and verifies it's a
 * timezone the runtime knows. Falls back to UTC for missing or unknown values so that callers that pass
 * the timezone on to MongoDB date operators don't make the aggregation fail.
 */
export const resolveTimezone = (timezone: string | null | undefined): string => {
  const normalized = timezone?.trim().replace(/ /g, '_');
  if (!normalized) {
    return FALLBACK_TIMEZONE;
  }
  try {
    const resolved = new Intl.DateTimeFormat('en-US', { timeZone: normalized }).resolvedOptions().timeZone;
    // Intl matches names case-insensitively, MongoDB doesn't: adopt Intl's spelling when it's only a
    // case difference. Don't adopt other canonicalizations (e.g. Europe/Kiev -> Europe/Kyiv), as
    // MongoDB's timezone database may not know the newer names.
    return resolved.toLowerCase() === normalized.toLowerCase() ? resolved : normalized;
  } catch {
    return FALLBACK_TIMEZONE;
  }
};
