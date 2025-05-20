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
