// @server-only
import { resolve } from 'node:path';

import { getUser } from '~/utils/session.server';
import Backend from 'i18next-fs-backend';
import { RemixI18Next } from 'remix-i18next/server';

import i18nextConfig from './i18n';

// Version for cache busting when translations update
const TRANSLATIONS_VERSION = '1.0.0';

// Custom locale resolver that prioritizes user's stored locale
class CustomI18Next extends RemixI18Next {
  async getLocale(request: Request): Promise<string> {
    // First, try to get the user's stored locale preference
    try {
      const user = await getUser(request);
      if (user?.locale && i18nextConfig.supportedLngs.includes(user.locale)) {
        return user.locale;
      }
    } catch (_error) {
      // If we can't get the user (not logged in, error, etc.), continue to browser detection
    }

    // Fall back to browser's Accept-Language header for non-authenticated users
    return super.getLocale(request);
  }
}

// Create custom instance with detection config
export default new CustomI18Next({
  detection: {
    // Language detection priority:
    // 1. Stored user locale (for authenticated users)
    // 2. Accept-Language header (for non-authenticated users or as fallback)
    // The detected language is stored/updated on login/register/refresh
    supportedLanguages: i18nextConfig.supportedLngs,
    fallbackLanguage: i18nextConfig.fallbackLng,
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
