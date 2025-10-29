// @server-only
import { resolve } from 'node:path';

import { createCookie } from '@remix-run/node';
import Backend from 'i18next-fs-backend';
import { RemixI18Next } from 'remix-i18next/server';

import i18nextConfig from './i18n';

// Version for cache busting when translations update
const TRANSLATIONS_VERSION = '1.0.0';

// Create a cookie for language preference
const languageCookie = createCookie('i18next', {
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
});

export default new RemixI18Next({
  detection: {
    // Language detection order: cookie, accept-language header, then fallback
    supportedLanguages: i18nextConfig.supportedLngs,
    fallbackLanguage: i18nextConfig.fallbackLng,
    // Cookie configuration
    cookie: languageCookie,
  },

  i18next: {
    ...i18nextConfig,
    backend: {
      // Path to translation files
      loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json'),
    },
  },

  plugins: [Backend],
});

export { TRANSLATIONS_VERSION };
