import { type MetaFunction } from '@remix-run/node';
import { useActionData } from '@remix-run/react';
import LoginPage from '~/components/LoginPage';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign in to Analytodon' }];
};

export async function loader() {
  // TODO: Check if user is already authenticated and redirect to dashboard if so
  return null;
}

export async function action() {
  // This will be implemented later to handle the actual login
  // For now, just return an error to show the error state
  return { error: 'Login functionality will be implemented soon' };
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return <LoginPage error={actionData?.error} />;
}
