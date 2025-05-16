import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import type { LinksFunction } from '@remix-run/node';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useAppTheme } from './utils/theme';
import { AuthProvider } from './utils/auth.context';
import { CacheProvider } from '@emotion/react';
import { createEmotionCache } from './utils/createEmotionCache';
import { withEmotionCache } from '@emotion/react';

// Create a client-side cache, shared for the whole session of the user in the browser
createEmotionCache();

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

export async function loader() {
  // TODO: Implement actual auth check using cookies/session
  return {
    user: null,
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

const Document = withEmotionCache(({ children, title }: DocumentProps, emotionCache) => {
  const theme = useAppTheme();

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
