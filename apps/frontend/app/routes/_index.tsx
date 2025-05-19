import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { getUser } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is logged in
  const user = await getUser(request);

  // If user is logged in, redirect to app dashboard
  if (user) {
    return redirect('/app');
  }

  // If not logged in, redirect to login page
  return redirect('/login');
}

// This component will never be rendered because the loader always redirects
export default function Index() {
  return null;
}
