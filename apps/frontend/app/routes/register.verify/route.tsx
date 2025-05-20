import * as React from 'react';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
} from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Link as RemixLink, useLoaderData, useRouteLoaderData } from '@remix-run/react';
import {
  FormCard,
  FormSection,
  HeroBackground,
  HeroContent,
  HeroSection,
  LoginContainer,
} from '~/components/LoginPage/styles';
import Logo from '~/components/Logo';
import { createAuthApi } from '~/services/api.server';
import { refreshAccessToken, requireUser, withSessionHandling } from '~/utils/session.server'; // Import withSessionHandling

export const meta: MetaFunction = () => {
  return [{ title: 'Verify Your Email' }];
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  // request.__apiClientSession is guaranteed to be set by withSessionHandling
  const session = request.__apiClientSession!;
  let user = await requireUser(request); // Use let as user object might be updated after token refresh

  const url = new URL(request.url);
  const verificationCode = url.searchParams.get('c');

  // This check should use the potentially updated user object later in the flow
  // if (user.emailVerified) { ... }

  // If we have a verification code, process it
  let verificationStatus = null;

  if (verificationCode) {
    if (user.emailVerified) {
      // If already verified (e.g. user re-clicks link), redirect immediately
      if (user.accounts.length === 0) {
        throw redirect('/accounts/connect');
      }
      throw redirect('/');
    }
    try {
      const authApi = createAuthApi(); // No token needed for verify email
      await authApi.authControllerVerifyEmail({ code: verificationCode });

      // After successful verification, refresh the session to get updated user data
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

      verificationStatus = { success: true, message: 'Your email has been successfully verified!' };
    } catch (error) {
      if (error instanceof Response) {
        // Re-throw redirects, HOF will handle cookie
        throw error;
      }
      console.error('Email verification error:', error);
      verificationStatus = {
        success: false,
        message: 'Failed to verify your email. The verification code may be invalid or expired.',
      };
    }
  }

  // HOF will wrap this data in a Response and commit session
  return {
    email: user.email, // user.email should be up-to-date if refresh occurred
    verificationCode,
    verificationStatus,
  };
});

export default function VerifyEmailPage() {
  const { email, verificationStatus } = useLoaderData<typeof loader>();
  const theme = useTheme();

  // Get ENV from the root loader data
  const rootData = useRouteLoaderData<{ ENV: { MARKETING_URL: string; SUPPORT_EMAIL: string } }>('root');
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || import.meta.env.VITE_SUPPORT_EMAIL;

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
          <Dialog open fullWidth>
            <DialogTitle>
              {verificationStatus
                ? verificationStatus.success
                  ? 'Email Verified'
                  : 'Verification Failed'
                : 'Email Verification Required'}
            </DialogTitle>
            <DialogContent>
              {verificationStatus ? (
                <>
                  <Alert severity={verificationStatus.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                    {verificationStatus.message}
                  </Alert>
                  <DialogContentText>
                    {verificationStatus.success
                      ? 'You can now continue setting up your Analytodon account.'
                      : `Please check your inbox for an email sent to ${email} and click the verification link to complete your registration.`}
                  </DialogContentText>
                </>
              ) : (
                <DialogContentText>
                  Please check your inbox for an email sent to <strong>{email}</strong> and click the verification link
                  to complete your registration.
                </DialogContentText>
              )}
            </DialogContent>
            <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pb: 2 }}>
              <Button href={`mailto:${supportEmail}?subject=Support`}>Contact Support</Button>
              {verificationStatus?.success && (
                <Button component={RemixLink} to="/" variant="contained" color="primary">
                  Go to Analytodon
                </Button>
              )}
            </DialogActions>
          </Dialog>
        </FormCard>
      </FormSection>
    </LoginContainer>
  );
}
