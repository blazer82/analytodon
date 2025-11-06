import * as React from 'react';
import { useTranslation } from 'react-i18next';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Alert, Box, IconButton, InputAdornment, Link as MuiLink, Typography, useTheme } from '@mui/material';
import { Form, Link, useNavigation } from '@remix-run/react';
import Footer from '~/components/Footer';
import Logo from '~/components/Logo';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';

import {
  FormCard,
  FormSection,
  HeroBackground,
  HeroContent,
  HeroSection,
  LinksContainer,
  LoginContainer,
} from './styles';

interface LoginPageProps {
  error?: string;
  message?: string | null;
  isRegistrationDisabled?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ error, message, isRegistrationDisabled = false }) => {
  const { t } = useTranslation('routes.login');
  const theme = useTheme();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' || navigation.state === 'loading';

  const [showPassword, setShowPassword] = React.useState(false);

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
              id="email"
              label={t('form.emailLabel')}
              name="email"
              autoComplete="email"
              sx={{ mb: 3 }}
            />

            <StyledTextField
              required
              fullWidth
              name="password"
              label={t('form.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? t('form.hidePassword') : t('form.showPassword')}
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

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {message && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {message}
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
              {!isRegistrationDisabled ? (
                <Typography variant="body2" align="center">
                  <MuiLink component={Link} to="/register" underline="hover">
                    {t('links.register')}
                  </MuiLink>
                </Typography>
              ) : (
                <Typography variant="body2" align="center" color="textSecondary">
                  {t('links.registrationsClosed')}
                </Typography>
              )}
              <Typography variant="body2" align="center">
                <MuiLink component={Link} to="/reset-password" underline="hover">
                  {t('links.forgotPassword')}
                </MuiLink>
              </Typography>
            </LinksContainer>
          </Box>
        </FormCard>
        <Footer />
      </FormSection>
    </LoginContainer>
  );
};

export default LoginPage;
