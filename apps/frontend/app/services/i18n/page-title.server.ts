// @server-only
import logger from '~/services/logger.server';

import i18next from './i18next.server';

/**
 * Translate a route's document title in a loader. `meta` cannot use hooks, so
 * the loader returns the result as `pageTitle` and `meta` reads it with
 * `pageTitleMeta()`.
 *
 * The title uses the locale the root loader resolves for the rest of the page.
 * Pass the `user` the loader already fetched (`null` when nobody is logged in)
 * to avoid a second profile request; leave it `undefined` in loaders that do
 * not look at the session.
 *
 * Returns `undefined` when the title cannot be translated, in which case
 * `pageTitleMeta()` falls back to its default title rather than failing the
 * whole page over a tab title.
 */
export async function getPageTitle(
  request: Request,
  namespace: string,
  user?: { locale?: string } | null,
  key = 'meta.title',
): Promise<string | undefined> {
  try {
    const locale = user === undefined ? await i18next.getLocale(request) : i18next.getLocaleForUser(request, user);
    const t = await i18next.getFixedT(locale, namespace);
    const title = t(key);
    return typeof title === 'string' && title !== key ? title : undefined;
  } catch (error) {
    logger.error('Failed to translate page title:', error, { namespace, key });
    return undefined;
  }
}
