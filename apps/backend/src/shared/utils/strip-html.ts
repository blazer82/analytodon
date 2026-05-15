const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

// String.fromCodePoint throws RangeError for codepoints > 0x10FFFF.
// Return the original entity text on failure so one malformed entity can't
// break the whole CSV stream.
const safeFromCodePoint = (num: number, original: string): string => {
  if (!Number.isFinite(num)) return original;
  try {
    return String.fromCodePoint(num);
  } catch {
    return original;
  }
};

const decodeEntities = (input: string): string =>
  input
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (match) => HTML_ENTITIES[match] ?? match)
    .replace(/&#(\d+);/g, (match, code: string) => safeFromCodePoint(Number(code), match))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex: string) => safeFromCodePoint(parseInt(hex, 16), match));

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
