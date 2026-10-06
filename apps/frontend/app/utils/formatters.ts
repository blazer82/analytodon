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

// Keep entity decoding in sync with apps/backend/src/shared/utils/strip-html.ts
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

// String.fromCodePoint throws RangeError for code points > 0x10FFFF, so keep
// the original entity text for malformed input instead of failing to render.
const safeFromCodePoint = (num: number, original: string): string => {
  // Like browsers, replace NUL and lone surrogates with U+FFFD
  if (num === 0 || (num >= 0xd800 && num <= 0xdfff)) return '\uFFFD';
  try {
    return String.fromCodePoint(num);
  } catch {
    return original;
  }
};

/**
 * Decodes the HTML entities Mastodon emits in status content. Done in a single
 * pass so already-decoded text (e.g. `&amp;#39;` -> `&#39;`) isn't decoded again.
 * @param input The text to decode.
 * @returns The decoded text.
 */
export function decodeEntities(input: string): string {
  return input.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(amp|lt|gt|quot|apos|nbsp));/g,
    (match, dec?: string, hex?: string, name?: string) => {
      if (dec) return safeFromCodePoint(Number(dec), match);
      if (hex) return safeFromCodePoint(parseInt(hex, 16), match);
      return NAMED_ENTITIES[name as string] ?? match;
    },
  );
}

/**
 * Shortens a toot's content to a specified length for single-line display:
 * removes HTML tags, decodes entities and collapses whitespace.
 * @param content The toot content to shorten.
 * @param length The maximum length (in characters) of the shortened content.
 * @returns The shortened content string.
 */
export function shortenToot(content: string, length = 95): string {
  const withoutTags = content
    // Keep line and paragraph breaks as word separators
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  const cleaned = decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
  // Iterate by code point so emoji and other astral characters aren't split in half
  const chars = Array.from(cleaned);
  return chars.length > length ? chars.slice(0, length - 1).join('') + '…' : cleaned;
}
