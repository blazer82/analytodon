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
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
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
    console.log('[DEBUG] Emotion effect running. document.readyState:', document.readyState);
    const metaPoint = document.querySelector('meta[name="emotion-insertion-point"]');
    console.log('[DEBUG] meta[name="emotion-insertion-point"] found?:', metaPoint);
    if (metaPoint) {
      console.log('[DEBUG] metaPoint.nextSibling:', metaPoint.nextSibling);
    }
    console.log('[DEBUG] document.head.innerHTML BEFORE emotionCache operations:\n', document.head.innerHTML);
    console.log(
      '[DEBUG] emotionCache.sheet.tags BEFORE flush:',
      JSON.stringify(emotionCache.sheet.tags.map((tag) => tag.outerHTML)),
    );

    // Re-link sheet container
    emotionCache.sheet.container = document.head;

    // Re-inject tags
    const tags = emotionCache.sheet.tags;
    emotionCache.sheet.flush();
    console.log('[DEBUG] document.head.innerHTML AFTER emotionCache.sheet.flush():\n', document.head.innerHTML);
    console.log('[DEBUG] Tags to re-inject:', JSON.stringify(tags.map((tag) => tag.outerHTML)));
    tags.forEach((tag, index) => {
      console.log(`[DEBUG] Attempting to re-inject tag ${index}:`, tag.outerHTML);
      const currentMetaPoint = document.querySelector('meta[name="emotion-insertion-point"]');
      let anchorNode;
      if (emotionCache.sheet.tags.length === 0 && currentMetaPoint) {
        // Simplified logic for first tag after flush
        anchorNode = currentMetaPoint.nextSibling;
      } else if (emotionCache.sheet.tags.length > 0) {
        anchorNode = emotionCache.sheet.tags[emotionCache.sheet.tags.length - 1].nextSibling;
      }
      console.log(`[DEBUG] Anchor node for tag ${index}:`, anchorNode);
      console.log(
        `[DEBUG] Is anchor node child of document.head? (if anchorNode exists):`,
        anchorNode ? document.head.contains(anchorNode) : 'N/A',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (emotionCache.sheet as any)._insertTag(tag);
      console.log(`[DEBUG] Tag ${index} re-injected. document.head.innerHTML NOW:\n`, document.head.innerHTML);
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
