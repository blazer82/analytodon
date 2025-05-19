import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getUser } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Connect Your Mastodon Account' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);

  if (!user) {
    throw redirect('/login');
  }

  if (!user.emailVerified) {
    throw redirect('/register/verify');
  }

  if (user.accounts.length > 0) {
    throw redirect('/');
  }

  return json({ user });
}

export default function ConnectAccountPage() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Connect Your Mastodon Account</h1>
      <p>Welcome, {user.email}!</p>
      <p>Your email is verified. Now, let&apos;s connect your Mastodon account.</p>
      {/* Placeholder for account connection UI */}
    </div>
  );
}
