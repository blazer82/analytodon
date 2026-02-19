import { useEffect } from 'react';

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation } from '@remix-run/react';
import Layout from '~/components/Layout';
import { createAdminApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import type { AdminViewAsData } from '~/utils/admin-view';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }];
};

// Declare i18n namespaces for this route
export const handle = {
  i18n: ['routes._app', 'components.layout'],
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request); // Ensures user is logged in and handles basic redirects

  const session = request.__apiClientSession!;
  let activeAccountId = session.get('activeAccountId') as string | undefined;

  if (user.accounts && user.accounts.length > 0) {
    const accountExists = activeAccountId ? user.accounts.some((acc) => acc.id === activeAccountId) : false;
    if (!activeAccountId || !accountExists) {
      activeAccountId = user.accounts[0].id; // Default to the first account
      session.set('activeAccountId', activeAccountId);
      // Session modification will be handled by withSessionHandling HOF
    }
  } else {
    // No accounts, ensure activeAccountId is not set
    if (activeAccountId) {
      session.unset('activeAccountId');
      activeAccountId = undefined;
      // Session modification will be handled by withSessionHandling HOF
    }
  }

  let currentAccount = activeAccountId ? user.accounts.find((acc) => acc.id === activeAccountId) : null;

  // Admin "View As" mode: fetch the viewed account's details for the banner.
  // This runs on every navigation in view-as mode. We accept this because:
  // (a) admin-only with negligible traffic, (b) fast indexed _id lookup,
  // (c) caching would add complexity with risk of stale banner data.
  let adminViewAs: AdminViewAsData | null = null;
  if (user.role === 'admin') {
    const url = new URL(request.url);
    const viewAsAccountId = url.searchParams.get('viewAs');
    if (viewAsAccountId) {
      try {
        const adminApi = await createAdminApiWithAuth(request);
        const accountDetail = await adminApi.adminControllerGetAccountById({ accountId: viewAsAccountId });
        adminViewAs = {
          accountId: accountDetail.id,
          accountName: accountDetail.accountName || accountDetail.name || accountDetail.serverURL,
          ownerEmail: accountDetail.owner.email,
        };
        // Override currentAccount display with the viewed account
        currentAccount = {
          id: accountDetail.id,
          name: accountDetail.name,
          accountName: accountDetail.accountName,
          avatarURL: accountDetail.avatarURL,
        } as typeof currentAccount;
      } catch (error) {
        if (error instanceof Response) throw error;
        logger.error('Failed to load admin viewAs account:', error);
        // Fall through — adminViewAs stays null, normal view
      }
    }
  }

  // The HOF will handle creating the Response and committing the session
  return { user, currentAccount, adminViewAs };
});

export const action = withSessionHandling(async ({ request }: ActionFunctionArgs) => {
  await requireUser(request); // Ensure user is authenticated
  const formData = await request.formData();
  const accountId = formData.get('accountId') as string;

  if (!accountId) {
    throw redirect('/', { status: 400 }); // Bad request
  }

  // request.__apiClientSession is guaranteed to be set by withSessionHandling
  const session = request.__apiClientSession!;
  session.set('activeAccountId', accountId);

  // The HOF will handle committing the session and forming the redirect Response
  throw redirect('/dashboard'); // Throw redirect, HOF will add cookie
});

export default function AppLayout() {
  const { user, currentAccount } = useLoaderData<typeof loader>();
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/dashboard') return 'Dashboard';
    if (path === '/followers') return 'Followers';
    if (path === '/replies') return 'Replies';
    if (path === '/boosts') return 'Boosts';
    if (path === '/favorites') return 'Favorites';
    if (path === '/top-posts') return 'Top Posts';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/admin')) return 'Admin';

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
