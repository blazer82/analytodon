import * as React from 'react';
import { useTranslation } from 'react-i18next';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Autocomplete,
  Box,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Typography,
  useTheme,
} from '@mui/material';
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
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
import { createUserSession, getUser, withSessionHandling } from '~/utils/session.server';
import timezones from '~/utils/timezones.json';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign up for Analytodon' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.register',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  // Check if user is already authenticated and redirect to dashboard if so
  const user = await getUser(request);
  if (user) {
    return redirect('/');
  }

  // Check if registrations are disabled
  const isRegistrationDisabled = process.env.DISABLE_NEW_REGISTRATIONS === 'true';
  if (isRegistrationDisabled) {
    return redirect('/login?message=New registrations are currently disabled');
  }

  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  let serverURL = '';

  if (username) {
    const atIndex = username.lastIndexOf('@');
    if (atIndex !== -1 && atIndex < username.length - 1) {
      serverURL = username.substring(atIndex + 1);
    }
  }

  return { serverURL };
});

export async function action({ request }: ActionFunctionArgs) {
  // Check if registrations are disabled
  const isRegistrationDisabled = process.env.DISABLE_NEW_REGISTRATIONS === 'true';
  if (isRegistrationDisabled) {
    // Translation key: messages.registrationDisabled
    return new Response(JSON.stringify({ error: 'New registrations are currently disabled' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const serverURL = formData.get('serverURL') as string;
  let timezone = formData.get('timezone') as string;

  // Extract the actual timezone name if it includes the offset part
  if (timezone && timezone.includes(' (')) {
    timezone = timezone.split(' (')[0];
  }

  // Validate form data
  if (!email || !password || !serverURL || !timezone) {
    // Translation key: errors.allFieldsRequired
    return new Response(JSON.stringify({ error: 'All fields are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password.length < 8) {
    // Translation key: errors.passwordTooShort
    return new Response(JSON.stringify({ error: 'Password must be at least 8 characters long' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const authApi = createAuthApi();
    const authResponse = await authApi.authControllerRegister({
      registerUserDto: {
        email,
        password,
        serverURLOnSignUp: serverURL,
        timezone,
      },
    });

    return createUserSession(authResponse, '/');
  } catch (error: unknown) {
    logger.error('Registration error:', error);

    const apiError = error as { response?: { status: number; json: () => Promise<{ message?: string | string[] }> } };
    if (apiError.response) {
      const status = apiError.response.status;
      // Translation key: errors.generic
      let errorMessage = 'An error occurred during registration. Please try again.';
      try {
        const errorJson = await apiError.response.json();
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message) ? errorJson.message.join(', ') : errorJson.message;
        }
      } catch (_e) {
        // Ignore if parsing error body fails
      }

      if (status === 400) {
        // Translation key: errors.invalidData (with {{errorMessage}} interpolation)
        return new Response(JSON.stringify({ error: `Invalid data: ${errorMessage}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (status === 409) {
        // Translation key: errors.emailAlreadyRegistered
        return new Response(JSON.stringify({ error: 'Email already registered. Please try to login.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Translation key: errors.unexpected
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default function Register() {
  const { t } = useTranslation('routes.register');
  const { serverURL: initialServerURL } = useLoaderData<typeof loader>();
  const theme = useTheme();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' || navigation.state === 'loading';
  const [showPassword, setShowPassword] = React.useState(false);
  const [values, setValues] = React.useState({
    email: '',
    password: '',
    serverURL: initialServerURL || '',
    timezone: '',
  });

  const timezoneOptions = React.useMemo(
    () => timezones.map(({ name, utcOffset }) => ({ label: `${name} (${utcOffset})`, name, utcOffset })),
    [],
  );

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

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
            {t('hero.title')}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 4, opacity: 0.9 }}>
            {t('hero.subtitle')}
          </Typography>
        </HeroContent>
      </HeroSection>

      <FormSection>
        <FormCard>
          <Typography variant="h5" component="h2" align="center" sx={{ mb: 3, fontWeight: 600 }}>
            {t('form.title')}
          </Typography>

          <Box component={Form} method="post" noValidate>
            <StyledTextField
              required
              fullWidth
              label={t('form.emailLabel')}
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
              sx={{ mb: 3 }}
            />
            <StyledTextField
              required
              fullWidth
              name="password"
              label={t('form.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              sx={{ mb: 3 }}
              slotProps={{
                input: {
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
                },
              }}
            />
            <StyledTextField
              required
              fullWidth
              label={t('form.serverUrlLabel')}
              name="serverURL"
              placeholder={t('form.serverUrlPlaceholder')}
              helperText={t('form.serverUrlHelper')}
              value={values.serverURL}
              onChange={(e) => setValues({ ...values, serverURL: e.target.value })}
              sx={{ mb: 3 }}
            />
            <Autocomplete
              disablePortal
              options={timezoneOptions}
              fullWidth
              value={timezoneOptions.find(({ name }) => name === values.timezone)}
              onChange={(_, value) => setValues({ ...values, timezone: value?.name ?? '' })}
              renderInput={(params) => (
                <StyledTextField
                  {...params}
                  required
                  fullWidth
                  name="timezone"
                  label={t('form.timezoneLabel')}
                  helperText={t('form.timezoneHelper')}
                  sx={{ mb: 3 }}
                />
              )}
            />

            {actionData?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionData.error}
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
              {isSubmitting ? t('form.submitting') : t('form.submit')}
            </StyledButton>

            <LinksContainer>
              <Typography variant="body2" align="center">
                <MuiLink component={Link} to="/login" underline="hover">
                  {t('links.login')}
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
