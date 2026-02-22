// @server-only
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

import logger from '~/services/logger.server';
import { getUser } from '~/utils/session.server';
import Backend from 'i18next-fs-backend';
import { RemixI18Next } from 'remix-i18next/server';

import i18nextConfig from './i18n';

/**
 * Get the correct path to translation files based on environment
 * In development: ./public/locales/
 * In production: ./build/client/locales/
 */
function getLocalesPath(): string {
  const prodPath = resolve('./build/client/locales');
  const devPath = resolve('./public/locales');

  // Try production path first (check if it exists)
  try {
    statSync(prodPath);
    return prodPath;
  } catch {
    // Fall back to dev path
    return devPath;
  }
}

// Version for cache busting when translations update
const TRANSLATIONS_VERSION = '1.5.0';

/**
 * Parse Accept-Language header and return languages in priority order
 * Format: "fr-FR,fr;q=0.9,de;q=0.8,en-US;q=0.7,en;q=0.6"
 */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((lang) => {
      const parts = lang.trim().split(';');
      const code = parts[0];
      const qValue = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
      return { code, qValue };
    })
    .sort((a, b) => b.qValue - a.qValue) // Sort by quality value (highest first)
    .map((item) => item.code);
}

/**
 * Find the best matching supported language from the browser's preferences
 */
function findBestMatchingLanguage(acceptLanguageHeader: string, supportedLanguages: string[]): string {
  const preferredLanguages = parseAcceptLanguage(acceptLanguageHeader);

  logger.info('[i18n] Parsing Accept-Language header', {
    raw: acceptLanguageHeader,
    parsed: preferredLanguages,
    supported: supportedLanguages,
  });

  for (const preferredLang of preferredLanguages) {
    // Try exact match first (e.g., "de" === "de")
    if (supportedLanguages.includes(preferredLang)) {
      logger.info('[i18n] Found exact match', { matched: preferredLang });
      return preferredLang;
    }

    // Try base language code (e.g., "de-DE" -> "de")
    const baseLang = preferredLang.split('-')[0].toLowerCase();
    if (supportedLanguages.includes(baseLang)) {
      logger.info('[i18n] Found base language match', { preferred: preferredLang, matched: baseLang });
      return baseLang;
    }
  }

  // No match found, return fallback
  logger.info('[i18n] No match found, using fallback', { fallback: i18nextConfig.fallbackLng });
  return i18nextConfig.fallbackLng as string;
}

// Custom locale resolver that prioritizes user's stored locale
class CustomI18Next extends RemixI18Next {
  async getLocale(request: Request): Promise<string> {
    // First, try to get the user's stored locale preference
    try {
      const user = await getUser(request);
      if (user?.locale && i18nextConfig.supportedLngs.includes(user.locale)) {
        logger.info('[i18n] Using user stored locale', { locale: user.locale });
        return user.locale;
      }
    } catch (_error) {
      // If we can't get the user (not logged in, error, etc.), continue to browser detection
      logger.debug('[i18n] No user found, falling back to browser detection');
    }

    // Fall back to browser's Accept-Language header for non-authenticated users
    const acceptLanguageHeader = request.headers.get('Accept-Language');
    if (acceptLanguageHeader) {
      const matched = findBestMatchingLanguage(acceptLanguageHeader, i18nextConfig.supportedLngs);
      logger.info('[i18n] Final locale determined', { locale: matched });
      return matched;
    }

    // Final fallback if no Accept-Language header
    logger.info('[i18n] No Accept-Language header, using fallback', { locale: i18nextConfig.fallbackLng });
    return i18nextConfig.fallbackLng as string;
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
      // Path to translation files (supports both dev and production)
      loadPath: resolve(getLocalesPath(), '{{lng}}', '{{ns}}.json'),
    },
  },

  plugins: [Backend],
});

export { TRANSLATIONS_VERSION };
