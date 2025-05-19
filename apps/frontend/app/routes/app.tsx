import { useEffect } from 'react';

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import Layout from '~/components/Layout';
import { requireUser } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Require user to be logged in, redirects to login if not
  const user = await requireUser(request);

  // TODO: Fetch the current active account or default to the first account
  const currentAccount = user.accounts.length > 0 ? user.accounts[0] : null;

  return {
    user,
    currentAccount,
  };
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
