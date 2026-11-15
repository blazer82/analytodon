import dayjs from 'dayjs';

/**
 * Formats a date string or Date object as a medium date in the given UI language,
 * e.g. "Apr 24, 2025" (en), "24. Apr. 2025" (de), "2025年4月24日" (ja).
 * @param date The date to format.
 * @param timezone Optional timezone string (e.g., "America/New_York"); defaults to UTC.
 * @param locale The UI language (i18n.language); defaults to English.
 * @returns The formatted date string.
 */
export function formatDate(date: string | Date, timezone?: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone ? timezone.replace(' ', '_') : 'UTC',
  }).format(dayjs(date).toDate());
}

// Chart x-values are formatted in the runtime's timezone (as before); only the locale varies.
/** Chart date with year, e.g. "Sep 1, 2026" (en), "1. Sept. 2026" (de), "2026年9月1日" (ja). */
export const formatChartDate = (value: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

/** Short chart axis tick without year, e.g. "Sep 1" (en), "1. Sept." (de), "9月1日" (ja). */
export const formatChartTick = (value: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(value));

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
 * Turns a toot's HTML content into plain single-line text: removes HTML tags,
 * decodes entities and collapses whitespace. Not shortened.
 * @param content The toot content (HTML).
 * @returns The complete text of the toot.
 */
export function tootToPlainText(content: string): string {
  const withoutTags = content
    // Keep line and paragraph breaks as word separators
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

// Code point ranges that are East Asian Wide or Fullwidth (CJK ideographs, kana, Hangul, fullwidth
// forms, ...). Halfwidth katakana (U+FF61-FF9F) is deliberately not part of it.
const WIDE_RANGES: [number, number][] = [
  [0x1100, 0x115f], // Hangul Jamo initial consonants
  [0x2e80, 0x303e], // CJK radicals, Kangxi radicals, CJK symbols and punctuation
  [0x3041, 0x33ff], // Hiragana, Katakana, Bopomofo, Hangul compatibility Jamo, enclosed CJK, CJK compatibility
  [0x3400, 0x4dbf], // CJK unified ideographs extension A
  [0x4e00, 0xa4cf], // CJK unified ideographs, Yi
  [0xa960, 0xa97f], // Hangul Jamo extended-A
  [0xac00, 0xd7a3], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe10, 0xfe19], // Vertical forms
  [0xfe30, 0xfe6f], // CJK compatibility forms, small form variants
  [0xff01, 0xff60], // Fullwidth forms
  [0xffe0, 0xffe6], // Fullwidth signs
  [0x16fe0, 0x18cff], // Ideographic symbols, Tangut, Khitan
  [0x1aff0, 0x1b2ff], // Kana extensions and supplement, Nushu
  [0x1f200, 0x1f2ff], // Enclosed ideographic supplement
  [0x20000, 0x3fffd], // CJK unified ideographs extensions B and later
];

// Emoji shown as pictures (by default, via variation selector 16, or as flags) are as wide as a CJK character
const EMOJI = /\p{Emoji_Presentation}|\p{Regional_Indicator}|\uFE0F/u;

/**
 * Display width of one user-perceived character in "columns": 2 for East Asian
 * wide/fullwidth characters and emoji, 1 for everything else.
 */
const graphemeWidth = (grapheme: string): number => {
  const codePoint = grapheme.codePointAt(0) ?? 0;
  const wide = codePoint >= 0x1100 && WIDE_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
  return wide || EMOJI.test(grapheme) ? 2 : 1;
};

// User-perceived characters, so that emoji sequences (skin tones, flags, families) and combining
// marks are neither split nor counted several times. Falls back to code points in old browsers.
const splitGraphemes = (text: string): string[] => {
  if (typeof Intl.Segmenter !== 'function') return Array.from(text);
  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
};

/**
 * Display width of a text in columns: Latin and other narrow characters count 1,
 * East Asian wide/fullwidth characters and emoji count 2 (they are about twice as wide).
 * @param text The text to measure.
 * @returns The width in columns.
 */
export function displayWidth(text: string): number {
  return splitGraphemes(text).reduce((width, grapheme) => width + graphemeWidth(grapheme), 0);
}

/**
 * Shortens a toot's content to a specified display width for single-line display:
 * removes HTML tags, decodes entities and collapses whitespace.
 *
 * The length is measured in columns rather than characters (see displayWidth), so
 * a Japanese post is cut at about the same visual width as a Latin one. For text
 * without wide characters and emoji this is the same as its number of characters.
 * @param content The toot content to shorten.
 * @param length The maximum width (in columns, i.e. Latin characters) of the shortened content, including the ellipsis.
 * @returns The shortened content string.
 */
export function shortenToot(content: string, length = 95): string {
  const cleaned = tootToPlainText(content);
  const graphemes = splitGraphemes(cleaned);
  // Cheap way out for the common case: no character is wider than 2 columns
  if (graphemes.length * 2 <= length) return cleaned;

  let width = 0;
  let fitting = 0; // number of leading characters that fit next to the ellipsis (1 column)
  for (const [index, grapheme] of graphemes.entries()) {
    width += graphemeWidth(grapheme);
    if (width <= length - 1) fitting = index + 1;
    if (width > length) return graphemes.slice(0, fitting).join('') + '…';
  }
  return cleaned;
}
