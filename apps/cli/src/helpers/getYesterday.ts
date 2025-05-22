import { getDaysAgo } from './getDaysAgo';

export const getYesterday = (timezone: string) => getDaysAgo(1, timezone);
