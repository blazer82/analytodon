import { getDateInTimezone } from './getDateInTimezone';

export const getDaysAgo = (days: number, timezone: string) => {
  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() - days);

  return getDateInTimezone(referenceDate, timezone);
};
