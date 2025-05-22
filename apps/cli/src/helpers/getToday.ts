import { getDaysAgo } from './getDaysAgo';

export const getToday = (timezone: string) => getDaysAgo(0, timezone);
