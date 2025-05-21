/**
 * Formats a date string or Date object into "MMM DD, YYYY" format.
 * e.g., "Apr 24, 2025"
 * @param date The date to format.
 * @returns The formatted date string.
 */
export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a number using the current locale's number formatting.
 * e.g., 12345.67 -> "12,345.67" (for en-US)
 * @param num The number to format.
 * @returns The formatted number string.
 */
export function formatNumber(num: number): string {
  if (num == null) return '0'; // Or handle as an error/empty string
  return new Intl.NumberFormat().format(num);
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
