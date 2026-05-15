// Leading characters that spreadsheet apps (Excel, Numbers, LibreOffice) treat as
// the start of a formula. Prefixing with a single quote forces the cell to be
// rendered as text.
const FORMULA_PREFIX_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Returns a CSV-safe string for the given value, preventing formula injection
 * when the cell is opened in a spreadsheet application. Numbers/booleans are
 * stringified as-is (they cannot trigger formula evaluation). Nullish becomes ''.
 */
export const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const str = String(value);
  if (str.length === 0) return str;
  return FORMULA_PREFIX_CHARS.includes(str[0]) ? `'${str}` : str;
};
