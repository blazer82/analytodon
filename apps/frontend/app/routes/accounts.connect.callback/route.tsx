import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getUser } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Processing Account Connection...' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request); // Get user, but don't enforce full setup yet for this specific callback
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get('token'); // Or 'code' depending on your OAuth provider

  if (!user) {
    throw redirect('/login'); // Should have a user session to reach here
  }

  if (!user.emailVerified) {
    throw redirect('/register/verify'); // Email should be verified before account connection
  }

  // Placeholder: OAuth callback handling logic will be implemented here.
  // This will involve exchanging the oauthToken for Mastodon account details,
  // updating the user's session/data, and then redirecting.

  if (oauthToken) {
    // Simulate processing
    return json({
      message: 'OAuth callback received. Processing...',
      oauthToken,
      status: 'processing',
    });
  }

  // If no token, it's an error or direct access
  return json({ error: 'Invalid OAuth callback.' }, { status: 400 });
}

export default function AccountsConnectCallbackPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Connecting Mastodon Account</h1>
      {'status' in data && data.status === 'processing' && (
        <>
          <p>{data.message}</p>
          <p>Token received: {data.oauthToken}</p>
          <p>Please wait while we set up your account.</p>
          {/* In a real app, this page would likely auto-redirect after processing */}
        </>
      )}
      {'error' in data && data.error && <p style={{ color: 'red' }}>Error: {data.error}</p>}
      <p>
        <a href="/">Go to Dashboard</a>
      </p>
    </div>
  );
}
