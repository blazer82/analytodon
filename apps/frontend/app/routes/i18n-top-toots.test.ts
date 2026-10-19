import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import i18nConfig from '../services/i18n/i18n';
import { handle as boostsHandle } from './_app.boosts/route';
import { handle as dashboardHandle } from './_app.dashboard';
import { handle as favoritesHandle } from './_app.favorites/route';
import { handle as repliesHandle } from './_app.replies/route';
import { handle as topPostsHandle } from './_app.top-posts/route';

const TOP_TOOTS_NAMESPACE = 'components.topToots';

const ROUTES = [
  { name: '_app.dashboard', handle: dashboardHandle },
  { name: '_app.boosts', handle: boostsHandle },
  { name: '_app.favorites', handle: favoritesHandle },
  { name: '_app.replies', handle: repliesHandle },
  { name: '_app.top-posts', handle: topPostsHandle },
] as const;

function namespacesOf(handle: { i18n: string | string[] }): string[] {
  return Array.isArray(handle.i18n) ? handle.i18n : [handle.i18n];
}

const localesDir = join(__dirname, '..', '..', 'public', 'locales');
const supportedLngs: string[] = i18nConfig.supportedLngs;

describe(`${TOP_TOOTS_NAMESPACE} SSR namespace declaration`, () => {
  // Regression test for #138: TopToots calls useTranslation('components.topToots'),
  // but the routes rendering it did not declare that namespace in handle.i18n, so the
  // resource was never loaded during SSR and raw keys (e.g. "headers.date") were emitted.
  it.each(ROUTES)('$name declares the topToots namespace', ({ handle }) => {
    expect(namespacesOf(handle)).toContain(TOP_TOOTS_NAMESPACE);
  });

  it.each(ROUTES)('$name declares its own route namespace', ({ handle }) => {
    expect(namespacesOf(handle).some((ns) => ns.startsWith('routes.'))).toBe(true);
  });

  it('every supported language ships the topToots namespace file', () => {
    expect(supportedLngs.length).toBeGreaterThan(0);

    for (const lang of supportedLngs) {
      const file = join(localesDir, lang, `${TOP_TOOTS_NAMESPACE}.json`);
      expect(readdirSync(localesDir).includes(lang)).toBe(true);
      expect(() => readFileSync(file, 'utf8')).not.toThrow();
    }
  });

  it('topToots namespace defines the table headers TopToots renders', () => {
    for (const lang of supportedLngs) {
      const messages = JSON.parse(readFileSync(join(localesDir, lang, `${TOP_TOOTS_NAMESPACE}.json`), 'utf8'));

      expect(Object.keys(messages.headers ?? {}).sort()).toEqual(['boosts', 'date', 'favorites', 'replies', 'toot']);
    }
  });
});
