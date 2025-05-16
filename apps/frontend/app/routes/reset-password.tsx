import * as React from 'react';

import { Alert, Box, Link as MuiLink, Typography, useTheme } from '@mui/material';
import { type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData } from '@remix-run/react';
import Footer from '~/components/Footer';
import {
  FormCard,
  FormSection,
  HeroBackground,
  HeroContent,
  HeroSection,
  LinksContainer,
  LoginContainer,
  StyledTextField,
  SubmitButton,
} from '~/components/LoginPage/styles';
import Logo from '~/components/Logo';

export const meta: MetaFunction = () => {
  return [{ title: 'Reset your Analytodon password' }];
};

export async function loader() {
  return null;
}

export async function action() {
  // This will be implemented later to handle the actual password reset request
  return { error: 'Password reset functionality will be implemented soon' };
}

export default function ResetPassword() {
  const theme = useTheme();
  const actionData = useActionData<typeof action>();

  return (
    <LoginContainer>
      <HeroSection>
        <HeroBackground>
          {/* Abstract pattern background */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="50%" cy="50%" r="150" fill="currentColor" fillOpacity="0.1" />
            <circle cx="70%" cy="30%" r="100" fill="currentColor" fillOpacity="0.1" />
            <circle cx="30%" cy="70%" r="120" fill="currentColor" fillOpacity="0.1" />
          </svg>
        </HeroBackground>
        <HeroContent>
          <Logo size="large" color={theme.palette.primary.contrastText} />
          <Typography variant="h4" component="h1" sx={{ mt: 3, fontWeight: 700 }}>
            Password Reset
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 4, opacity: 0.9 }}>
            Don&apos;t worry! It happens to the best of us. Enter your email address and we&apos;ll send you a link to
            reset your password.
          </Typography>
        </HeroContent>
      </HeroSection>

      <FormSection>
        <FormCard>
          <Typography variant="h5" component="h2" align="center" sx={{ mb: 3, fontWeight: 600 }}>
            Reset your password
          </Typography>

          <Box component={Form} method="post" noValidate>
            <StyledTextField
              required
              fullWidth
              label="Your Email Address"
              name="email"
              autoComplete="email"
              placeholder="Enter the email you used to register"
            />

            {actionData?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionData.error}
              </Alert>
            )}

            <SubmitButton type="submit" fullWidth variant="contained" size="large">
              Send Reset Link
            </SubmitButton>

            <LinksContainer>
              <Typography variant="body2" align="center">
                <MuiLink component={Link} to="/login" underline="hover">
                  Remember your password? Sign in
                </MuiLink>
              </Typography>
            </LinksContainer>
          </Box>
        </FormCard>
        <Footer />
      </FormSection>
    </LoginContainer>
  );
}
