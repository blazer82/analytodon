import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, Container, FormGroup, Link, Paper, Snackbar, Typography } from '@mui/material';
import { ActionFunctionArgs, json, LoaderFunctionArgs, MetaFunction, redirect } from '@remix-run/node';
import { Form, Link as RemixLink, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';
import Title from '~/components/Title';
import { createAccountsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';
import { stripSchema } from '~/utils/url';

export const meta: MetaFunction = () => {
  return [{ title: 'Edit Account - Analytodon' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.editAccount',
};

export const loader = withSessionHandling(async ({ request, params }: LoaderFunctionArgs) => {
  await requireUser(request);
  const { accountId } = params;

  if (!accountId) {
    throw redirect('/settings/accounts');
  }

  try {
    const accountsApi = await createAccountsApiWithAuth(request);
    const account = await accountsApi.accountsControllerFindOne({ accountId });
    return { account };
  } catch (error) {
    logger.error('Failed to load account:', error, { accountId });
    throw redirect('/settings/accounts');
  }
});

export const action = withSessionHandling(async ({ request, params }: ActionFunctionArgs) => {
  await requireUser(request);
  const { accountId } = params;

  if (!accountId) {
    return json({ error: 'Account ID is required' }, { status: 400 });
  }

  const formData = await request.formData();
  const name = formData.get('name') as string;

  try {
    const accountsApi = await createAccountsApiWithAuth(request);
    await accountsApi.accountsControllerUpdate({
      accountId,
      updateAccountDto: {
        name,
      },
    });

    return json({ success: true });
  } catch (error) {
    logger.error('Failed to update account:', error, { accountId });
    return json({ error: 'errors.failedToUpdate' }, { status: 500 });
  }
});

export default function EditAccountPage() {
  const { account } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { t } = useTranslation('routes.editAccount');
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [errorSnackbarOpen, setErrorSnackbarOpen] = React.useState(!!actionData?.error);
  const [successSnackbarOpen, setSuccessSnackbarOpen] = React.useState(!!actionData?.success);

  React.useEffect(() => {
    setErrorSnackbarOpen(!!actionData?.error);
    setSuccessSnackbarOpen(!!actionData?.success);
  }, [actionData]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, animation: 'fadeIn 0.6s ease-out' }}>
      <Title>{t('title')}</Title>
      <Paper
        sx={{
          p: 4,
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 25px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            opacity: 0.7,
          },
        }}
      >
        <Form method="post">
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.name')}
              name="name"
              defaultValue={account.name}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </FormGroup>
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.username')}
              value={account.username}
              disabled
              InputLabelProps={{ shrink: Boolean(account.username) }}
              fullWidth
            />
          </FormGroup>
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.serverUrl')}
              value={stripSchema(account.serverURL)}
              disabled
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </FormGroup>
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.accountUrl')}
              value={account.accountURL}
              disabled
              InputLabelProps={{ shrink: Boolean(account.accountURL) }}
              fullWidth
            />
          </FormGroup>
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.avatarUrl')}
              value={account.avatarURL}
              disabled
              InputLabelProps={{ shrink: Boolean(account.avatarURL) }}
              fullWidth
            />
          </FormGroup>
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.timezone')}
              value={account.timezone}
              disabled
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </FormGroup>
          {account.accountName && (
            <Typography component="p" sx={{ mb: 3 }}>
              {t('connection.connected', { accountName: account.accountName }).replace(account.accountName, '')}
              <Link href={account.accountURL || ''} target="_blank" rel="noopener noreferrer">
                {account.accountName}
              </Link>
            </Typography>
          )}
          {!account.accountName && (
            <Typography component="p" sx={{ mb: 3 }}>
              {t('connection.notConnected')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'right', mt: 3 }}>
            <StyledButton variant="outlined" component={RemixLink} to="/settings/accounts" sx={{ mr: 2 }}>
              {t('actions.back')}
            </StyledButton>
            <StyledButton variant="contained" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('actions.saving') : t('actions.save')}
            </StyledButton>
          </Box>
        </Form>
      </Paper>

      <Snackbar
        open={errorSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error">{t(actionData?.error || '')}</Alert>
      </Snackbar>
      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSuccessSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success">{t('success.accountSaved')}</Alert>
      </Snackbar>
    </Container>
  );
}
