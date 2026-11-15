/**
 * Formats a date range with the year shown once, e.g. "Nov 2 – Nov 8, 2026" (en),
 * "2. Nov. – 8. Nov. 2026" (de) or "2026年11月2日～11月8日" (ja).
 *
 * Intl's own formatRange() is not used because it falls back to a purely numeric
 * form for Japanese ("2026/11/02～2026/11/08").
 */
export function formatDateRange(from: Date, to: Date, locale: string, timeZone: string): string {
  const withoutYear = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone });
  const withYear = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone });

  // Languages that write the year first (e.g. Japanese) carry it on the start date
  const parts = withYear.formatToParts(from).map((part) => part.type);
  const yearFirst = parts.indexOf('year') < parts.indexOf('day');

  return yearFirst
    ? `${withYear.format(from)}～${withoutYear.format(to)}`
    : `${withoutYear.format(from)} – ${withYear.format(to)}`;
}
