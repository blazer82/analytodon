import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { getUser, withSessionHandling } from '~/utils/session.server';

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  // Check if user is logged in
  const user = await getUser(request);

  // If user is logged in, redirect to app dashboard
  if (user) {
    return redirect('/dashboard');
  }

  // If not logged in, redirect to login page
  return redirect('/login');
});

// This component will never be rendered because the loader always redirects
export default function Index() {
  return null;
}
