import * as React from 'react';

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
import timezones from '~/utils/timezones.json';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign up for Analytodon' }];
};

export async function loader() {
  // TODO: Check if user is already authenticated and redirect to dashboard if so
  return null;
}

export async function action() {
  // This will be implemented later to handle the actual registration
  return { error: 'Registration functionality will be implemented soon' };
}

export default function Register() {
  const theme = useTheme();
  const actionData = useActionData<typeof action>();
  const [showPassword, setShowPassword] = React.useState(false);
  const [values, setValues] = React.useState({
    email: '',
    password: '',
    serverURL: '',
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
            Join Analytodon
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 4, opacity: 0.9 }}>
            Start tracking your Mastodon analytics today and gain valuable insights about your audience and content
            performance.
          </Typography>
        </HeroContent>
      </HeroSection>

      <FormSection>
        <FormCard>
          <Typography variant="h5" component="h2" align="center" sx={{ mb: 3, fontWeight: 600 }}>
            Create your account
          </Typography>

          <Box component={Form} method="post" noValidate>
            <StyledTextField
              required
              fullWidth
              label="Your Email Address"
              name="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
            <StyledTextField
              required
              fullWidth
              name="password"
              label="Choose a Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
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
              label="Mastodon Server URL"
              name="serverURL"
              placeholder="mastodon.social"
              helperText="The URL of the Mastodon instance your account is on"
              value={values.serverURL}
              onChange={(e) => setValues({ ...values, serverURL: e.target.value })}
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
                  label="Your Timezone"
                  helperText="The timezone you want your analytics reports to be in"
                />
              )}
            />

            {actionData?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionData.error}
              </Alert>
            )}

            <SubmitButton type="submit" fullWidth variant="contained" size="large">
              Create Account
            </SubmitButton>

            <LinksContainer>
              <Typography variant="body2" align="center">
                <MuiLink component={Link} to="/login" underline="hover">
                  Already have an account? Sign in
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
