import * as React from 'react';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Alert, Box, IconButton, InputAdornment, Link as MuiLink, Typography, useTheme } from '@mui/material';
import { type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import Footer from '~/components/Footer';
import {
  FormCard,
  FormSection,
  HeroBackground,
  HeroContent,
  HeroSection,
  LinksContainer,
  LoginContainer,
} from '~/components/LoginPage/styles';
import Logo from '~/components/Logo';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';
import { createAuthApi } from '~/services/api.server';
import logger from '~/services/logger.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Reset your Analytodon password' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('t');
  return { token };
}

// Define the types for our action data
type ActionDataSuccess = {
  success: string;
  completed?: boolean;
};

type ActionDataError = {
  error: string;
};

type ActionData = ActionDataSuccess | ActionDataError;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  // Check if this is a request for password reset email or actual password reset
  if (formData.has('email')) {
    const email = formData.get('email') as string;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const authApi = createAuthApi();
      await authApi.authControllerRequestPasswordReset({
        requestPasswordResetDto: { email },
      });

      // For security reasons, always return success even if email doesn't exist
      return {
        success: 'If an account with this email exists, a password reset link has been sent.',
      };
    } catch (error) {
      logger.error('Password reset request error:', error, { email });
      // For security reasons, always return success even if email doesn't exist
      return {
        success: 'If an account with this email exists, a password reset link has been sent.',
      };
    }
  } else {
    // This is the actual password reset with token
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Reset token is missing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Passwords do not match' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const authApi = createAuthApi();
      await authApi.authControllerResetPassword({
        resetPasswordDto: { token, password },
      });

      return {
        success: 'Your password has been reset successfully. You can now log in with your new password.',
        completed: true,
      };
    } catch (error: unknown) {
      logger.error('Password reset error:', error, { tokenProvided: !!token });

      // Handle API errors
      const apiError = error as { response?: { status: number } };
      if (apiError.response) {
        const status = apiError.response.status;
        if (status === 404) {
          return new Response(JSON.stringify({ error: 'Invalid or expired password reset token.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(
        JSON.stringify({ error: 'An error occurred while resetting your password. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }
}

export default function ResetPassword() {
  const theme = useTheme();
  const { token } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' || navigation.state === 'loading';
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  // Determine if we're showing the request form or the reset form
  const isResetForm = !!token;
  // Check if password reset was completed successfully
  const isResetCompleted = actionData && 'success' in actionData && !!actionData.completed;

  return (
    <LoginContainer>
      <HeroSection>
        <HeroBackground>
          {/* Abstract pattern background */}
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
          <Typography variant="h4" component="h1" sx={{ mt: 3, fontWeight: 700 }}>
            Password Reset
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 4, opacity: 0.9 }}>
            {isResetForm
              ? 'Create a new password for your account.'
              : "Don't worry! It happens to the best of us. Enter your email address and we'll send you a link to reset your password."}
          </Typography>
        </HeroContent>
      </HeroSection>

      <FormSection>
        <FormCard>
          <Typography variant="h5" component="h2" align="center" sx={{ mb: 3, fontWeight: 600 }}>
            {isResetForm ? 'Create new password' : 'Reset your password'}
          </Typography>

          {isResetCompleted ? (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                {actionData && 'success' in actionData && actionData.success}
              </Alert>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link to="/login" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
                  <StyledButton fullWidth variant="contained" size="large" sx={{ mt: 2, mb: 3 }}>
                    Go to Login
                  </StyledButton>
                </Link>
              </Box>
            </>
          ) : (
            <Box component={Form} method="post" noValidate>
              {isResetForm ? (
                <>
                  <input type="hidden" name="token" value={token} />

                  <StyledTextField
                    required
                    fullWidth
                    name="password"
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    sx={{ mb: 3 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <StyledTextField
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    sx={{ mb: 3 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowConfirmPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              ) : (
                <StyledTextField
                  required
                  fullWidth
                  label="Your Email Address"
                  name="email"
                  autoComplete="email"
                  placeholder="Enter the email you used to register"
                  sx={{ mb: 3 }}
                />
              )}

              {actionData && 'error' in actionData && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {actionData.error}
                </Alert>
              )}

              {actionData && 'success' in actionData && !isResetCompleted && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {actionData.success}
                </Alert>
              )}

              <StyledButton
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 2, mb: 3 }}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isResetForm
                    ? 'Resetting Password...'
                    : 'Sending Link...'
                  : isResetForm
                    ? 'Reset Password'
                    : 'Send Reset Link'}
              </StyledButton>

              <LinksContainer>
                <Typography variant="body2" align="center">
                  <MuiLink component={Link} to="/login" underline="hover">
                    Remember your password? Sign in
                  </MuiLink>
                </Typography>
              </LinksContainer>
            </Box>
          )}
        </FormCard>
        <Footer />
      </FormSection>
    </LoginContainer>
  );
}
