import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useActionData } from '@remix-run/react';
import LoginPage from '~/components/LoginPage';
import { createAuthApi } from '~/services/api.server';
import { createUserSession, getUser } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign in to Analytodon' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
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
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate form data
  if (!email || !password) {
    return json({ error: 'Email and password are required' }, { status: 400 });
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
    console.error('Login error:', error);

    // Handle API errors
    const apiError = error as { response?: { status: number } };
    if (apiError.response) {
      const status = apiError.response.status;
      if (status === 401) {
        return json({ error: 'Invalid email or password' }, { status: 401 });
      }
      if (status === 429) {
        return json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
      }
    }

    return json({ error: 'An error occurred during login. Please try again.' }, { status: 500 });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return <LoginPage error={actionData?.error} />;
}
