import type { MetaDescriptor } from '@remix-run/node';

/**
 * Build a route's `meta` from the `pageTitle` its loader translated.
 *
 * `data` is undefined when the loader threw (error boundaries) and `pageTitle`
 * is missing when the translation failed; both fall back to the given title.
 */
export function pageTitleMeta(data: unknown, fallbackTitle: string): MetaDescriptor[] {
  const pageTitle = (data as { pageTitle?: unknown } | null | undefined)?.pageTitle;
  return [{ title: typeof pageTitle === 'string' && pageTitle ? pageTitle : fallbackTitle }];
}
