// Keep entity decoding in sync with apps/frontend/app/utils/formatters.ts
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

// String.fromCodePoint throws RangeError for codepoints > 0x10FFFF.
// Return the original entity text on failure so one malformed entity can't
// break the whole CSV stream.
const safeFromCodePoint = (num: number, original: string): string => {
  // Like browsers, replace NUL and lone surrogates with U+FFFD
  if (num === 0 || (num >= 0xd800 && num <= 0xdfff)) return '\uFFFD';
  try {
    return String.fromCodePoint(num);
  } catch {
    return original;
  }
};

// Single pass so already-decoded text (e.g. `&amp;#39;` -> `&#39;`) isn't decoded again.
export const decodeEntities = (input: string): string =>
  input.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(amp|lt|gt|quot|apos|nbsp));/g,
    (match, dec?: string, hex?: string, name?: string) => {
      if (dec) return safeFromCodePoint(Number(dec), match);
      if (hex) return safeFromCodePoint(parseInt(hex, 16), match);
      return NAMED_ENTITIES[name as string] ?? match;
    },
  );

export const stripHtml = (input: string | undefined | null): string => {
  if (!input) return '';
  const withBreaks = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(h[1-6]|div|blockquote)>/gi, '\n');
  const withoutTags = withBreaks.replace(/<[^>]*>/g, '');
  const decoded = decodeEntities(withoutTags);
  return decoded
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
