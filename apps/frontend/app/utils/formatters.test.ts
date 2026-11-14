import { describe, expect, it } from 'vitest';

import {
  decodeEntities,
  displayWidth,
  formatChartDate,
  formatChartTick,
  formatDate,
  formatNumber,
  shortenToot,
  tootToPlainText,
} from './formatters';

describe('formatDate', () => {
  it('should format a Date object', () => {
    const date = new Date('2025-04-24T12:00:00Z');
    expect(formatDate(date)).toBe('Apr 24, 2025');
  });

  it('should format an ISO string', () => {
    expect(formatDate('2025-01-15T00:00:00Z')).toBe('Jan 15, 2025');
  });

  it('should default to UTC when no timezone provided', () => {
    // 11pm UTC on Jan 15 is still Jan 15 in UTC
    expect(formatDate('2025-01-15T23:00:00Z')).toBe('Jan 15, 2025');
  });

  it('should apply timezone when provided', () => {
    // Midnight UTC on Jan 16 is still Jan 15 in US Pacific (UTC-8)
    expect(formatDate('2025-01-16T00:00:00Z', 'America/Los_Angeles')).toBe('Jan 15, 2025');
  });

  it('should apply timezone that rolls the date forward', () => {
    // 11pm UTC on Jan 15 is Jan 16 in Tokyo (UTC+9)
    expect(formatDate('2025-01-15T23:00:00Z', 'Asia/Tokyo')).toBe('Jan 16, 2025');
  });

  it('should replace spaces with underscores in timezone names', () => {
    // "America/New York" (with space) should be handled as "America/New_York"
    expect(formatDate('2025-07-04T12:00:00Z', 'America/New York')).toBe('Jul 4, 2025');
  });

  it('should format in the given UI language', () => {
    expect(formatDate('2026-09-01T12:00:00Z', undefined, 'en')).toBe('Sep 1, 2026');
    expect(formatDate('2026-09-01T12:00:00Z', undefined, 'de')).toBe('1. Sept. 2026');
    expect(formatDate('2026-09-01T12:00:00Z', undefined, 'ja')).toBe('2026年9月1日');
  });

  it('should apply the timezone in every UI language', () => {
    expect(formatDate('2025-01-15T23:00:00Z', 'Asia/Tokyo', 'de')).toBe('16. Jan. 2025');
    expect(formatDate('2025-01-15T23:00:00Z', 'Asia/Tokyo', 'ja')).toBe('2025年1月16日');
  });
});

// Chart values are formatted in the runtime's timezone, so use midday to stay on the same day everywhere
describe('formatChartDate', () => {
  it('should format a date with year in the given UI language', () => {
    expect(formatChartDate('2026-09-01T12:00:00', 'en')).toBe('Sep 1, 2026');
    expect(formatChartDate('2026-09-01T12:00:00', 'de')).toBe('1. Sept. 2026');
    expect(formatChartDate('2026-09-01T12:00:00', 'ja')).toBe('2026年9月1日');
  });
});

describe('formatChartTick', () => {
  it('should format a short date without year in the given UI language', () => {
    expect(formatChartTick('2026-09-01T12:00:00', 'en')).toBe('Sep 1');
    expect(formatChartTick('2026-09-01T12:00:00', 'de')).toBe('1. Sept.');
    expect(formatChartTick('2026-09-01T12:00:00', 'ja')).toBe('9月1日');
  });
});

describe('formatNumber', () => {
  it('should format an integer with thousands separators', () => {
    expect(formatNumber(12345)).toBe('12,345');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should return "0" for null', () => {
    expect(formatNumber(null as unknown as number)).toBe('0');
  });

  it('should return "0" for undefined', () => {
    expect(formatNumber(undefined as unknown as number)).toBe('0');
  });

  it('should format negative numbers', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('should format decimal numbers', () => {
    expect(formatNumber(12345.67)).toBe('12,345.67');
  });

  it('should format large numbers', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

describe('shortenToot', () => {
  it('should return short content unchanged', () => {
    expect(shortenToot('Hello world')).toBe('Hello world');
  });

  it('should strip HTML tags', () => {
    expect(shortenToot('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('should truncate long content with ellipsis', () => {
    const long = 'A'.repeat(200);
    const result = shortenToot(long);
    expect(result).toHaveLength(95);
    expect(result.endsWith('…')).toBe(true);
  });

  it('should respect custom length parameter', () => {
    const long = 'A'.repeat(50);
    const result = shortenToot(long, 20);
    expect(result).toHaveLength(20);
    expect(result).toBe('A'.repeat(19) + '…');
  });

  it('should not truncate content exactly at the limit', () => {
    const exact = 'A'.repeat(95);
    expect(shortenToot(exact)).toBe(exact);
  });

  it('should strip nested HTML then truncate', () => {
    const nested = '<div><p>' + 'B'.repeat(200) + '</p></div>';
    const result = shortenToot(nested);
    expect(result).toHaveLength(95);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('<');
  });

  it('should return empty string for empty input', () => {
    expect(shortenToot('')).toBe('');
  });

  it('should return empty string for HTML-only content', () => {
    expect(shortenToot('<br><hr><img src="x">')).toBe('');
  });

  it('should decode HTML entities', () => {
    expect(shortenToot('<p>David Bowie&#39;s &quot;Telling Lies&quot; &amp; more</p>')).toBe(
      'David Bowie\'s "Telling Lies" & more',
    );
  });

  it('should keep encoded markup as literal text', () => {
    expect(shortenToot('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe('<script>alert(1)</script>');
  });

  it('should measure length after decoding entities', () => {
    expect(shortenToot('&quot;'.repeat(10), 20)).toBe('"'.repeat(10));
  });

  it('should separate paragraphs and line breaks with a space', () => {
    expect(shortenToot('<p>First line<br>second line</p><p>Next paragraph</p>')).toBe(
      'First line second line Next paragraph',
    );
  });

  it('should not split emoji when truncating', () => {
    // An emoji is as wide as two Latin characters: 18 + 2 columns fit exactly
    expect(shortenToot('A'.repeat(18) + '😀', 20)).toBe('A'.repeat(18) + '😀');
    expect(shortenToot('A'.repeat(17) + '😀😀😀', 20)).toBe('A'.repeat(17) + '😀…');
    expect(shortenToot('A'.repeat(18) + '😀😀😀', 20)).toBe('A'.repeat(18) + '…');
  });

  it('should keep emoji sequences (families, skin tones, flags) whole', () => {
    expect(shortenToot('👨‍👩‍👧‍👦'.repeat(10), 9)).toBe('👨‍👩‍👧‍👦'.repeat(4) + '…');
    expect(shortenToot('🙏🏽'.repeat(10), 9)).toBe('🙏🏽'.repeat(4) + '…');
    expect(shortenToot('🇯🇵'.repeat(10), 8)).toBe('🇯🇵'.repeat(3) + '…');
    const result = shortenToot('Hi ' + '👩🏾‍💻'.repeat(100));
    expect(result).toBe('Hi ' + '👩🏾‍💻'.repeat(45) + '…');
    expect(result).not.toMatch(/[\u200D\uD800-\uDBFF]…$/);
  });

  it('should cut Latin text exactly as before: at 95 characters including the ellipsis', () => {
    const english =
      'This is a deliberately long English post that goes well past the ninety-five character limit of the table so that we can see where it is cut.';
    expect(shortenToot(english)).toBe(english.slice(0, 94) + '…');
    const german =
      'Längere deutsche Beiträge mit Umlauten wie ä, ö, ü und ß sollten genau wie bisher nach fünfundneunzig Zeichen abgeschnitten werden.';
    expect(shortenToot(german)).toBe(german.slice(0, 94) + '…');
    expect(shortenToot(german.slice(0, 95))).toBe(german.slice(0, 95));
  });

  it('should count Japanese (full-width) characters double', () => {
    // 47 full-width characters are 94 columns and fit; 48 are cut to 47 + ellipsis (95 columns)
    expect(shortenToot('あ'.repeat(47))).toBe('あ'.repeat(47));
    expect(shortenToot('あ'.repeat(48))).toBe('あ'.repeat(47) + '…');
    const japanese =
      'フェディバースでコミュニティを育てて一年が経ちました。この一年間に学んだこと、うまくいかなかったこと、そしてこれから試してみたいことを振り返ります。';
    const result = shortenToot(japanese);
    expect(result).toBe(
      'フェディバースでコミュニティを育てて一年が経ちました。この一年間に学んだこと、うまくいかなかっ…',
    );
    expect(displayWidth(result)).toBeLessThanOrEqual(95);
  });

  it('should leave Japanese posts that fit unchanged', () => {
    const post = 'マストドンで一番読まれる投稿時間、実は思っていたのと違いました。 #マストドン';
    expect(shortenToot(`<p>${post}</p>`)).toBe(post);
  });

  it('should measure mixed Latin and Japanese text by its display width', () => {
    const mixed =
      'Mastodon と Misskey の両方で3か月間 A/B テストをしてみた結果、朝8時台の投稿が一番 engagement rate が高いことが分かりました。詳しくは blog で。';
    const result = shortenToot(mixed);
    expect(result).toBe(
      'Mastodon と Misskey の両方で3か月間 A/B テストをしてみた結果、朝8時台の投稿が一番 engagement r…',
    );
    expect(displayWidth(result)).toBe(95);
    expect(shortenToot('ab漢字cd', 6)).toBe('ab漢…');
    expect(shortenToot('ab漢字c', 7)).toBe('ab漢字c');
  });

  it('should count halfwidth katakana and combining marks as narrow', () => {
    expect(shortenToot('ｱ'.repeat(30), 20)).toBe('ｱ'.repeat(19) + '…');
    // "e" + combining acute accent is one character
    expect(shortenToot('e\u0301'.repeat(30), 20)).toBe('e\u0301'.repeat(19) + '…');
  });
});

describe('shortenToot without Intl.Segmenter', () => {
  it('should still cut by display width, counting code points', () => {
    const segmenter = Object.getOwnPropertyDescriptor(Intl, 'Segmenter') as PropertyDescriptor;
    Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true });
    try {
      expect(shortenToot('あ'.repeat(48))).toBe('あ'.repeat(47) + '…');
      expect(shortenToot('a'.repeat(96))).toBe('a'.repeat(94) + '…');
      expect(shortenToot('A'.repeat(17) + '😀😀😀', 20)).toBe('A'.repeat(17) + '😀…');
    } finally {
      Object.defineProperty(Intl, 'Segmenter', segmenter);
    }
  });
});

describe('displayWidth', () => {
  it('should count narrow characters once and wide characters twice', () => {
    expect(displayWidth('')).toBe(0);
    expect(displayWidth('Grüße')).toBe(5);
    expect(displayWidth('日本語')).toBe(6);
    expect(displayWidth('ｶﾀｶﾅ')).toBe(4);
    expect(displayWidth('ＡＢＣ')).toBe(6);
    expect(displayWidth('한국어')).toBe(6);
    expect(displayWidth('abc、日本')).toBe(9);
    expect(displayWidth('😀')).toBe(2);
    expect(displayWidth('👨‍👩‍👧‍👦🇯🇵🙏🏽')).toBe(6);
    expect(displayWidth('☺️')).toBe(2);
  });
});

describe('tootToPlainText', () => {
  it('should return the complete text without tags', () => {
    const long = 'あ'.repeat(300);
    expect(tootToPlainText(`<p>${long}</p><p>Second &amp; last</p>`)).toBe(`${long} Second & last`);
  });
});

describe('decodeEntities', () => {
  it('should decode named entities', () => {
    expect(decodeEntities('Rock &amp; Roll &lt;tag&gt; &apos;a&apos; &quot;b&quot;&nbsp;c')).toBe(
      'Rock & Roll <tag> \'a\' "b" c',
    );
  });

  it('should decode decimal and hex character references', () => {
    expect(decodeEntities('Bowie&#8217;s &#39;x&#39; &#x22;Lies&#X22;')).toBe('Bowie’s \'x\' "Lies"');
  });

  it('should not decode the same text twice', () => {
    expect(decodeEntities('&amp;#39; &amp;quot; &amp;amp;')).toBe('&#39; &quot; &amp;');
  });

  it('should replace NUL and lone surrogates with U+FFFD', () => {
    expect(decodeEntities('a&#0;b&#xD800;c')).toBe('a\uFFFDb\uFFFDc');
  });

  it('should leave out-of-range and unknown entities intact', () => {
    expect(decodeEntities('&#9999999999; &#x110000; &copy;')).toBe('&#9999999999; &#x110000; &copy;');
  });
});
