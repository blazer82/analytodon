import { findTimeZone, getUTCOffset } from 'timezone-support';

export const getDateInTimezone = (referenceDate: Date, timezone: string) => {
  const date = new Date(
    Intl.DateTimeFormat('en-ca', {
      timeZone: timezone.replace(' ', '_'),
    }).format(referenceDate),
  );

  const { offset } = getUTCOffset(date, findTimeZone(timezone.replace(' ', '_')));

  // `offset` is in minutes, positive west of UTC (e.g. -330 for Asia/Kolkata). Apply it as a
  // single minute shift; splitting into floor(hours) + remainder breaks positive half-hour zones.
  date.setUTCMinutes(offset);
  return date;
};
