import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getUser } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Verify Your Email' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  const url = new URL(request.url);
  const verificationCode = url.searchParams.get('c');

  if (!user) {
    throw redirect('/login');
  }

  if (user.emailVerified) {
    if (user.accounts.length === 0) {
      throw redirect('/connect-account');
    }
    throw redirect('/');
  }

  // Placeholder: Logic to handle verificationCode will be added later
  return json({ email: user.email, verificationCode });
}

export default function VerifyEmailPage() {
  const { email, verificationCode } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Verify Your Email Address</h1>
      {verificationCode && <p>Received verification code: {verificationCode}. Processing...</p>}
      <p>
        A verification link has been sent to <strong>{email}</strong>.
      </p>
      <p>Please check your inbox and click the link to complete your registration.</p>
      {/* Placeholder for resend verification email functionality */}
    </div>
  );
}
