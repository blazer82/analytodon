import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import i18nConfig from '../services/i18n/i18n';

const routesDir = __dirname;
const localesDir = join(__dirname, '..', '..', 'public', 'locales');
const supportedLngs: string[] = i18nConfig.supportedLngs;

// Its loader always redirects, so the route never renders and its title is never shown.
const UNTRANSLATED_ROUTES = ['accounts.connect.callback/route.tsx'];

function routeFiles(): string[] {
  return readdirSync(routesDir).flatMap((entry) => {
    if (statSync(join(routesDir, entry)).isDirectory()) {
      return [`${entry}/route.tsx`];
    }
    return entry.endsWith('.tsx') ? [entry] : [];
  });
}

const routesWithMeta = routeFiles()
  .map((file) => ({ file, source: readFileSync(join(routesDir, file), 'utf-8') }))
  .filter(({ source }) => source.includes('export const meta'));

function flatten(value: unknown, prefix = ''): Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return { [prefix]: value };
  }
  return Object.entries(value).reduce<Record<string, unknown>>(
    (acc, [key, child]) => ({ ...acc, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

function metaTitles(lang: string, namespace: string): Record<string, unknown> {
  const messages = JSON.parse(readFileSync(join(localesDir, lang, `${namespace}.json`), 'utf-8')) as { meta?: unknown };
  return flatten(messages.meta ?? {});
}

describe('translated document titles', () => {
  // `meta` cannot use hooks: a title that is hardcoded there is English for everyone.
  it('finds the routes that set a title', () => {
    expect(routesWithMeta.length).toBeGreaterThan(20);
  });

  it.each(routesWithMeta.filter(({ file }) => !UNTRANSLATED_ROUTES.includes(file)))(
    '$file takes its title from the loader',
    ({ source }) => {
      // Booleans keep a failure from dumping the whole route source
      expect(source.includes('pageTitleMeta(data,')).toBe(true);
      expect(/getPageTitle\(request,|pageTitle: t\(/.test(source)).toBe(true);
    },
  );

  const titleNamespaces = [
    ...new Set(
      routesWithMeta.flatMap(({ source }) =>
        [...source.matchAll(/(?:getPageTitle|getFixedT)\([^,]+(?:\([^)]*\))?, '(routes\.[^']+)'/g)].map(
          (match) => match[1],
        ),
      ),
    ),
  ];

  it('finds the namespaces the titles are translated from', () => {
    expect(titleNamespaces.length).toBeGreaterThan(20);
  });

  it.each(titleNamespaces)('%s has the same title keys, in the same order, in every language', (namespace) => {
    const reference = Object.keys(metaTitles('en', namespace));
    expect(reference.length).toBeGreaterThan(0);

    for (const lang of supportedLngs) {
      const titles = metaTitles(lang, namespace);
      expect(Object.keys(titles), `${lang}/${namespace}.json`).toEqual(reference);

      for (const [key, title] of Object.entries(titles)) {
        expect(title, `${lang}/${namespace}.json meta.${key}`).toEqual(expect.any(String));
        expect((title as string).trim(), `${lang}/${namespace}.json meta.${key}`).not.toBe('');
        expect(title as string, `${lang}/${namespace}.json meta.${key}`).not.toMatch(/[。.]$/);
      }
    }
  });
});
