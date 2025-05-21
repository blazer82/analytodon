import { useTheme } from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import AccountSetupComplete from '~/components/AccountSetupComplete';
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
import { refreshAccessToken, requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Account Connected - Analytodon' }];
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const session = request.__apiClientSession!;
  let user = await requireUser(request); // Use let as user object might be updated after token refresh

  const url = new URL(request.url);
  const connectionToken = url.searchParams.get('state');
  const code = url.searchParams.get('code');

  // Both token and code are required for the OAuth callback
  if (!connectionToken || !code) {
    throw redirect('/accounts/connect');
  }

  try {
    // Call the API to handle the OAuth callback
    const accountsApi = await createAccountsApiWithAuth(request);
    await accountsApi.accountsControllerConnectCallback({
      state: connectionToken,
      code: code,
    });

    // The API will handle updating the account with the Mastodon credentials

    // After successful connection, refresh the session to get updated user data (e.g., new account in user.accounts)
    const currentRefreshToken = session.get('refreshToken');
    if (currentRefreshToken) {
      const newAuthResponse = await refreshAccessToken(currentRefreshToken);
      if (newAuthResponse) {
        // Session is already request.__apiClientSession from HOF
        session.set('accessToken', newAuthResponse.token);
        session.set('refreshToken', newAuthResponse.refreshToken);
        session.set('user', newAuthResponse.user);
        user = newAuthResponse.user; // Update local user variable
        // Session commit will be handled by HOF
      } else {
        // Refresh token failed, log out user
        throw redirect('/logout'); // HOF will handle cookie for redirect
      }
    } else {
      // No refresh token, this shouldn't happen for a logged-in user
      throw redirect('/logout'); // HOF will handle cookie for redirect
    }

    // After successful connection and session refresh, user object is updated.
    // Now decide where to redirect based on the number of accounts.
    if (user.accounts && user.accounts.length > 1) {
      // More than one account, redirect to the accounts page with a flag to show the completion dialog
      throw redirect('/settings/accounts?setup_complete=true');
    } else {
      // First account, redirect to the original setup complete page
      throw redirect('/accounts/setup-complete');
    }
  } catch (error) {
    if (error instanceof Response) {
      // Re-throw redirects, HOF will handle cookie
      throw error;
    }
    console.error('Error in OAuth callback:', error);

    // If there's an error, redirect back to the connect page. HOF will handle cookie.
    throw redirect('/accounts/connect?error=connection_failed');
  }
});

export default function AccountsConnectCallbackPage() {
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
          <AccountSetupComplete />
        </FormCard>
      </FormSection>
    </LoginContainer>
  );
}
