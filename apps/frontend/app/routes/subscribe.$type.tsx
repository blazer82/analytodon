import { Alert, Box, Typography, useTheme } from '@mui/material';
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
import { StyledButton } from '~/components/StyledFormElements';
import { createUsersApi } from '~/services/api.server';
import logger from '~/services/logger.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const typeLabel = data?.typeLabel || 'notifications';
  return [{ title: `Subscribe to ${typeLabel} - Analytodon` }];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('u');
  const email = url.searchParams.get('e');
  const type = params.type;

  // Map subscription type to human-readable label
  const typeLabels: Record<string, string> = {
    weekly: 'weekly statistics emails',
    news: 'news and updates',
  };

  const typeLabel = typeLabels[type || ''] || 'notifications';

  return { userId, email, type, typeLabel };
}

type ActionDataSuccess = {
  success: string;
};

type ActionDataError = {
  error: string;
};

type ActionData = ActionDataSuccess | ActionDataError;

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const userId = formData.get('userId') as string;
  const email = formData.get('email') as string;
  const type = params.type;

  if (!userId || !email || !type) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters. Please use the link from your email.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const usersApi = createUsersApi();
    await usersApi.usersControllerSubscribe({
      type,
      manageSubscriptionDto: {
        u: userId,
        e: email,
      },
    });

    // Map subscription type to human-readable label
    const typeLabels: Record<string, string> = {
      weekly: 'weekly statistics emails',
      news: 'news and updates',
    };
    const typeLabel = typeLabels[type] || 'these notifications';

    return {
      success: `You have been successfully subscribed to ${typeLabel}.`,
    };
  } catch (error: unknown) {
    logger.error('Subscribe error:', error, { type, userId, email });

    // Handle API errors
    const apiError = error as { response?: { status: number } };
    if (apiError.response) {
      const status = apiError.response.status;
      if (status === 404) {
        return new Response(JSON.stringify({ error: 'User not found.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (status === 400) {
        return new Response(JSON.stringify({ error: 'Invalid subscribe request.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export default function Subscribe() {
  const theme = useTheme();
  const { userId, email, type, typeLabel } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' || navigation.state === 'loading';

  const hasRequiredParams = userId && email && type;
  const isSubscribed = actionData && 'success' in actionData;

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
            Subscribe
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 4, opacity: 0.9 }}>
            {isSubscribed ? "You've been subscribed successfully." : `Subscribe to ${typeLabel}.`}
          </Typography>
        </HeroContent>
      </HeroSection>

      <FormSection>
        <FormCard>
          <Typography variant="h5" component="h2" align="center" sx={{ mb: 3, fontWeight: 600 }}>
            {isSubscribed ? 'Subscribed' : 'Confirm Subscribe'}
          </Typography>

          {!hasRequiredParams ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Invalid subscribe link. Please use the link from your email.
            </Alert>
          ) : isSubscribed ? (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                {actionData && 'success' in actionData && actionData.success}
              </Alert>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link to="/login" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
                  <StyledButton fullWidth variant="contained" size="large" sx={{ mt: 2, mb: 3 }}>
                    Go to Dashboard
                  </StyledButton>
                </Link>
              </Box>
            </>
          ) : (
            <Box component={Form} method="post" noValidate>
              <input type="hidden" name="userId" value={userId || ''} />
              <input type="hidden" name="email" value={email || ''} />

              <Typography variant="body1" align="center" sx={{ mb: 3 }}>
                Would you like to subscribe to <strong>{typeLabel}</strong>?
              </Typography>

              <Typography variant="body2" align="center" sx={{ mb: 3, color: 'text.secondary' }}>
                Email: <strong>{email}</strong>
              </Typography>

              {actionData && 'error' in actionData && (
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
                {isSubmitting ? 'Subscribing...' : 'Confirm Subscribe'}
              </StyledButton>

              <LinksContainer>
                <Typography variant="body2" align="center">
                  Don&apos;t want to subscribe?{' '}
                  <Link to="/login" style={{ color: theme.palette.primary.main, textDecoration: 'none' }}>
                    Go to Dashboard
                  </Link>
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
