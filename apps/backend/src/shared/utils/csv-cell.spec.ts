import { escapeCsvCell } from './csv-cell';

describe('escapeCsvCell', () => {
  it('returns empty string for nullish input', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeCsvCell('Hello world')).toBe('Hello world');
    expect(escapeCsvCell('')).toBe('');
    expect(escapeCsvCell('https://example.com/post/1')).toBe('https://example.com/post/1');
  });

  it("prefixes leading '=' with a single quote", () => {
    expect(escapeCsvCell('=cmd|"/c calc"!A1')).toBe(`'=cmd|"/c calc"!A1`);
  });

  it("prefixes leading '+', '-', '@' with a single quote", () => {
    expect(escapeCsvCell('+1234')).toBe(`'+1234`);
    expect(escapeCsvCell('-SUM(A1)')).toBe(`'-SUM(A1)`);
    expect(escapeCsvCell('@hostile')).toBe(`'@hostile`);
  });

  it('prefixes leading tab and carriage return with a single quote', () => {
    expect(escapeCsvCell('\tfoo')).toBe(`'\tfoo`);
    expect(escapeCsvCell('\rfoo')).toBe(`'\rfoo`);
  });

  it('stringifies numbers and booleans without escaping', () => {
    expect(escapeCsvCell(0)).toBe('0');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(-5)).toBe('-5');
    expect(escapeCsvCell(true)).toBe('true');
    expect(escapeCsvCell(false)).toBe('false');
  });

  it('does not escape strings where the meta-char appears later', () => {
    expect(escapeCsvCell('foo=bar')).toBe('foo=bar');
    expect(escapeCsvCell('a+b')).toBe('a+b');
  });
});
