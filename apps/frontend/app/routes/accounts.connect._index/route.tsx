import { useTheme } from '@mui/material';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import AccountSetup from '~/components/AccountSetup';
import {
  FormCard,
  FormSection,
  HeroBackground,
  HeroContent,
  HeroSection,
  LoginContainer,
} from '~/components/LoginPage/styles';
import Logo from '~/components/Logo';
import { createAccountsApiWithAuth } from '~/services/api.server';
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

  // Check if there's an error from a failed connection attempt
  const url = new URL(request.url);
  const error = url.searchParams.get('error');

  return {
    user,
    currentStep: 0,
    authUrl: null,
    error: error === 'connection_failed' ? 'Failed to connect to Mastodon. Please try again.' : undefined,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request);

  if (!user) {
    throw redirect('/login');
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'connect') {
    const serverURL = formData.get('serverURL') as string;
    let timezone = formData.get('timezone') as string;

    // Extract the actual timezone name if it includes the offset part
    if (timezone && timezone.includes(' (')) {
      timezone = timezone.split(' (')[0];
    }

    try {
      // 1. Create a new account
      const accountsApi = await createAccountsApiWithAuth(request);
      const account = await accountsApi.accountsControllerCreate({
        createAccountDto: {
          serverURL,
          timezone,
        },
      });

      // 2. Initiate the OAuth connection
      const connectionResponse = await accountsApi.accountsControllerConnect({
        id: account.id,
        body: {}, // Empty body is fine for this endpoint
      });

      // Redirect the user to the Mastodon authorization URL
      return redirect(connectionResponse.redirectUrl);
    } catch (error) {
      console.error('Error connecting account:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to connect to Mastodon server. Please check the server URL and try again.',
          currentStep: 0,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default function ConnectAccountPage() {
  const { user, currentStep, authUrl, error } = useLoaderData<typeof loader>();
  const theme = useTheme();

  return (
    <LoginContainer>
      <HeroSection>
        <HeroBackground>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#607d8b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#263238" stopOpacity="0.9" />
              </linearGradient>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gradient)" />
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="50%" cy="50%" r="150" fill="currentColor" fillOpacity="0.1" />
            <circle cx="70%" cy="30%" r="100" fill="currentColor" fillOpacity="0.1" />
            <circle cx="30%" cy="70%" r="120" fill="currentColor" fillOpacity="0.1" />
          </svg>
        </HeroBackground>
        <HeroContent>
          <Logo size="large" color={theme.palette.primary.contrastText} />
        </HeroContent>
      </HeroSection>

      <FormSection>
        <FormCard>
          <AccountSetup
            currentStep={currentStep}
            authUrl={authUrl || ''}
            initialServerURL={user.serverURLOnSignUp || ''}
            initialTimezone={user.timezone || ''}
            error={error}
          />
        </FormCard>
      </FormSection>
    </LoginContainer>
  );
}
