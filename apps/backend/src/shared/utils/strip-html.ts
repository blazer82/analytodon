const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const decodeEntities = (input: string): string =>
  input
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (match) => HTML_ENTITIES[match] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => {
      const num = Number(code);
      return Number.isFinite(num) ? String.fromCodePoint(num) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const num = parseInt(hex, 16);
      return Number.isFinite(num) ? String.fromCodePoint(num) : _;
    });

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
