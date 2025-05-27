import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

/**
 * Formats a date string or Date object into "MMM DD, YYYY" format.
 * e.g., "Apr 24, 2025"
 * @param date The date to format.
 * @param timezone Optional timezone string (e.g., "America/New_York").
 * @returns The formatted date string.
 */
export function formatDate(date: string | Date, timezone?: string): string {
  dayjs.extend(utc);
  dayjs.extend(tz);
  if (timezone) {
    return dayjs(date).tz(timezone.replace(' ', '_')).format('MMM DD, YYYY');
  }
  return dayjs(date).utc().format('MMM DD, YYYY');
}

/**
 * Formats a number using the en-US locale's number formatting.
 * e.g., 12345.67 -> "12,345.67"
 * @param num The number to format.
 * @returns The formatted number string.
 */
export function formatNumber(num: number): string {
  if (num == null) return '0'; // Or handle as an error/empty string
  // Explicitly use 'en-US' locale for consistent number formatting
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Shortens a toot's content to a specified length, removing HTML tags.
 * @param content The toot content to shorten.
 * @param length The maximum length of the shortened content.
 * @returns The shortened content string.
 */
export function shortenToot(content: string, length = 95): string {
  const cleaned = content.replace(/<[^>]*>/g, '');
  return cleaned.length > length ? cleaned.substring(0, length - 1) + '…' : cleaned;
}
