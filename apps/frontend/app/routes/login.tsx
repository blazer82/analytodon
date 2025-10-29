import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';
import LoginPage from '~/components/LoginPage';
import { createAuthApi } from '~/services/api.server';
import logger from '~/services/logger.server';
import { createUserSession, getUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign in to Analytodon' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.login',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  // Check if user is already authenticated and redirect to dashboard if so
  const user = await getUser(request);
  if (user) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
      },
    });
  }

  // Check if registrations are disabled
  const isRegistrationDisabled = process.env.DISABLE_NEW_REGISTRATIONS === 'true';

  // Get any message from query parameters
  const url = new URL(request.url);
  const message = url.searchParams.get('message');

  return { isRegistrationDisabled, message };
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate form data
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Call the API to login
    const authApi = createAuthApi();
    const authResponse = await authApi.authControllerLogin({
      loginDto: { email, password },
    });

    // Create a session and redirect to the dashboard
    return createUserSession(authResponse, '/');
  } catch (error: unknown) {
    logger.error('Login error:', error);

    // Handle API errors
    const apiError = error as { response?: { status: number } };
    if (apiError.response) {
      const status = apiError.response.status;
      if (status === 401) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'An error occurred during login. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  return (
    <LoginPage
      error={actionData?.error}
      message={loaderData?.message}
      isRegistrationDisabled={loaderData?.isRegistrationDisabled || false}
    />
  );
}
