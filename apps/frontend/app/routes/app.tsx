import { useEffect } from 'react';

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import Layout from '~/components/Layout';
import { requireUser, sessionStorage } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request); // Ensures user is logged in and handles basic redirects

  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  let activeAccountId = session.get('activeAccountId') as string | undefined;
  let sessionModified = false;

  if (user.accounts && user.accounts.length > 0) {
    const accountExists = activeAccountId ? user.accounts.some((acc) => acc.id === activeAccountId) : false;
    if (!activeAccountId || !accountExists) {
      activeAccountId = user.accounts[0].id; // Default to the first account
      session.set('activeAccountId', activeAccountId);
      sessionModified = true;
    }
  } else {
    // No accounts, ensure activeAccountId is not set
    if (activeAccountId) {
      session.unset('activeAccountId');
      activeAccountId = undefined;
      sessionModified = true;
    }
  }

  const currentAccount = activeAccountId ? user.accounts.find((acc) => acc.id === activeAccountId) : null;

  const headers = new Headers();
  if (sessionModified) {
    headers.set('Set-Cookie', await sessionStorage.commitSession(session));
  }

  if (headers.has('Set-Cookie')) {
    return new Response(JSON.stringify({ user, currentAccount }), {
      status: 200,
      headers: {
        ...Object.fromEntries(headers.entries()),
        'Content-Type': 'application/json',
      },
    });
  }

  return { user, currentAccount };
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request); // Ensure user is authenticated
  const formData = await request.formData();
  const accountId = formData.get('accountId') as string;

  if (!accountId) {
    return redirect('/app', { status: 400 }); // Bad request
  }

  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  session.set('activeAccountId', accountId);

  return redirect('/app', {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export default function AppLayout() {
  const { user, currentAccount } = useLoaderData<typeof loader>();
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/app') return 'Dashboard';
    if (path === '/app/followers') return 'Followers';
    if (path === '/app/replies') return 'Replies';
    if (path === '/app/boosts') return 'Boosts';
    if (path === '/app/favorites') return 'Favorites';
    if (path === '/app/top-posts') return 'Top Posts';
    if (path.includes('/app/settings')) return 'Settings';

    return 'Dashboard';
  };

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout
      title={getPageTitle()}
      accountName={currentAccount?.name || user.email}
      username={currentAccount?.accountName || user.email}
      avatarURL={currentAccount?.avatarURL}
    >
      <Outlet />
    </Layout>
  );
}
