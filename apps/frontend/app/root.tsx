import { useContext, useEffect, useLayoutEffect } from 'react';

import { CacheProvider, withEmotionCache } from '@emotion/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import type { LinksFunction } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import { getUser } from '~/utils/session.server';

import { AuthProvider } from './utils/auth.context';
import { ClientStyleContext } from './utils/client-style-context';
import { useAppTheme } from './utils/theme';

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: '/fonts/local-fonts.css',
  },
];

export async function loader({ request }: { request: Request }) {
  // Get the user from the session
  const user = await getUser(request);

  return {
    user,
    ENV: {
      MARKETING_URL: process.env.MARKETING_URL || 'https://analytodon.com',
      SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@analytodon.com',
    },
  };
}

interface DocumentProps {
  children: React.ReactNode;
  title?: string;
}

// Define the isomorphic hook
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const Document = withEmotionCache(({ children, title }: DocumentProps, emotionCache) => {
  const theme = useAppTheme();
  const clientStyleData = useContext(ClientStyleContext);

  // Only executed on client
  useIsomorphicLayoutEffect(() => {
    // Re-link sheet container
    emotionCache.sheet.container = document.head;

    // Re-inject tags
    const tags = emotionCache.sheet.tags;
    emotionCache.sheet.flush();
    tags.forEach((tag) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (emotionCache.sheet as any)._insertTag(tag);
    });

    // Reset cache to reapply global styles
    clientStyleData.reset();
  }, []);

  return (
    <html lang="en">
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

  return (
    <Document>
      <AuthProvider initialUser={user}>{children}</AuthProvider>
    </Document>
  );
}

export default function App() {
  return <Outlet />;
}
