/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { startTransition, StrictMode, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { CacheProvider } from '@emotion/react';
import { RemixBrowser } from '@remix-run/react';
import i18nextConfig from '~/services/i18n/i18n';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { getInitialNamespaces } from 'remix-i18next/client';

import { ClientStyleContext } from './utils/client-style-context';
import { createEmotionCache } from './utils/createEmotionCache';

// Version for cache busting when translations update
const TRANSLATIONS_VERSION = '1.3.0';

interface ClientCacheProviderProps {
  children: React.ReactNode;
}

function ClientCacheProvider({ children }: ClientCacheProviderProps) {
  const [cache, setCache] = useState(createEmotionCache());

  const clientStyleContextValue = {
    reset() {
      setCache(createEmotionCache());
    },
  };

  return (
    <ClientStyleContext.Provider value={clientStyleContextValue}>
      <CacheProvider value={cache}>{children}</CacheProvider>
    </ClientStyleContext.Provider>
  );
}

async function hydrate() {
  // Initialize i18next
  await i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(Backend)
    .init({
      ...i18nextConfig,
      ns: getInitialNamespaces(),

      // Language detection
      detection: {
        order: ['htmlTag'], // Read from <html lang="...">
        caches: [], // Don't cache in localStorage (prevents hydration mismatch)
      },

      // Client-side loading
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
        queryStringParams: { v: TRANSLATIONS_VERSION }, // Cache busting
      },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <I18nextProvider i18n={i18next}>
          <ClientCacheProvider>
            <RemixBrowser />
          </ClientCacheProvider>
        </I18nextProvider>
      </StrictMode>,
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}
