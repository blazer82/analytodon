import { describe, expect, it } from 'vitest';

import { stripSchema } from './url';

describe('stripSchema', () => {
  it('should strip https schema', () => {
    expect(stripSchema('https://example.com')).toBe('example.com');
  });

  it('should strip http schema', () => {
    expect(stripSchema('http://example.com')).toBe('example.com');
  });

  it('should strip schema and preserve path', () => {
    expect(stripSchema('https://example.com/path/to/page')).toBe('example.com/path/to/page');
  });

  it('should return unchanged when no schema present', () => {
    expect(stripSchema('example.com')).toBe('example.com');
  });

  it('should only strip leading schema, not schema in query params', () => {
    expect(stripSchema('https://example.com?url=https://other.com')).toBe('example.com?url=https://other.com');
  });

  it('should return empty string for empty input', () => {
    expect(stripSchema('')).toBe('');
  });
});
