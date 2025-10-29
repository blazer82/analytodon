import { useContext, useEffect, useLayoutEffect } from 'react';

import { CacheProvider, withEmotionCache } from '@emotion/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import i18next from '~/services/i18n/i18next.server';
import { getUser, withSessionHandling } from '~/utils/session.server';
import { useChangeLanguage } from 'remix-i18next/react';

import { AuthProvider } from './utils/auth.context';
import { ClientStyleContext } from './utils/client-style-context';
import { useAppTheme } from './utils/theme';

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: '/fonts/local-fonts.css',
  },
];

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  // Get the user from the session
  const user = await getUser(request);
  const locale = await i18next.getLocale(request);

  return {
    user,
    locale,
    ENV: {
      MARKETING_URL: process.env.MARKETING_URL || 'https://analytodon.com',
      SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@analytodon.com',
    },
  };
});

// Default namespace for root
export const handle = {
  i18n: 'common',
};

interface DocumentProps {
  children: React.ReactNode;
  title?: string;
  locale?: string;
}

// Define the isomorphic hook
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const Document = withEmotionCache(({ children, title, locale }: DocumentProps, emotionCache) => {
  const theme = useAppTheme();
  const clientStyleData = useContext(ClientStyleContext);

  // Only executed on client
  useIsomorphicLayoutEffect(() => {
    // Re-link sheet container
    emotionCache.sheet.container = document.head;

    // Re-inject tags with error handling per tag
    const tags = emotionCache.sheet.tags;
    emotionCache.sheet.flush();

    let hasInsertionError = false;
    tags.forEach((tag) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (emotionCache.sheet as any)._insertTag(tag);
      } catch (error) {
        // Log the error once, but continue processing other tags
        if (!hasInsertionError) {
          hasInsertionError = true;
          console.warn(
            'Failed to re-inject some Emotion style tags. This may be due to browser extensions or ad blockers. Styles will be regenerated.',
            error,
          );
        }
      }
    });

    // Reset cache to reapply global styles (always do this, even if some tags failed)
    clientStyleData.reset();
  }, []);

  return (
    <html lang={locale || 'en'} dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
        <meta name="emotion-insertion-point" content="" />
      </head>
      <body>
        <CacheProvider value={emotionCache}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </CacheProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
});

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>();
  const user = loaderData?.user ?? null;
  const locale = loaderData?.locale ?? 'en';

  // Sync language changes with remix-i18next
  useChangeLanguage(locale);

  return (
    <Document locale={locale}>
      <AuthProvider initialUser={user}>{children}</AuthProvider>
    </Document>
  );
}

export default function App() {
  return <Outlet />;
}
