import { stripHtml } from './strip-html';

describe('stripHtml', () => {
  it('returns empty string for nullish input', () => {
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml(null)).toBe('');
    expect(stripHtml('')).toBe('');
  });

  it('strips simple paragraph tags and keeps text', () => {
    expect(stripHtml('<p>Hello world</p>')).toBe('Hello world');
  });

  it('preserves links text but drops the anchor tag', () => {
    expect(stripHtml('<p>Hello <a href="https://example.com">world</a></p>')).toBe('Hello world');
  });

  it('converts <br> to a newline', () => {
    expect(stripHtml('line one<br>line two')).toBe('line one\nline two');
    expect(stripHtml('line one<br />line two')).toBe('line one\nline two');
  });

  it('collapses multiple paragraphs to double newlines', () => {
    expect(stripHtml('<p>One</p><p>Two</p>')).toBe('One\n\nTwo');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('Tom &amp; Jerry &lt;3 &quot;quoted&quot; &#39;single&#39;')).toBe(
      `Tom & Jerry <3 "quoted" 'single'`,
    );
  });

  it('decodes numeric and hex entities', () => {
    expect(stripHtml('snowman &#9731; alpha &#x3B1;')).toBe('snowman ☃ alpha α');
  });

  it('leaves out-of-range numeric entities intact instead of throwing', () => {
    expect(stripHtml('bogus &#9999999999; here')).toBe('bogus &#9999999999; here');
    expect(stripHtml('bogus &#x110000; here')).toBe('bogus &#x110000; here');
  });
});
