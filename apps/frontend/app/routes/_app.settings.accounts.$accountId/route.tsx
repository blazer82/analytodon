import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Container,
  FormGroup,
  Link,
  Paper,
  Snackbar,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { ActionFunctionArgs, json, LoaderFunctionArgs, MetaFunction, redirect } from '@remix-run/node';
import { Form, Link as RemixLink, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import Title from '~/components/Title';
import { createAccountsApiWithAuth } from '~/services/api.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';
import { stripSchema } from '~/utils/url';

export const meta: MetaFunction = () => {
  return [{ title: 'Edit Account - Analytodon' }];
};

export const loader = withSessionHandling(async ({ request, params }: LoaderFunctionArgs) => {
  await requireUser(request);
  const { accountId } = params;

  if (!accountId) {
    throw redirect('/settings/accounts');
  }

  try {
    const accountsApi = await createAccountsApiWithAuth(request);
    const account = await accountsApi.accountsControllerFindOne({ id: accountId });
    return { account };
  } catch (error) {
    console.error('Failed to load account:', error);
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
      id: accountId,
      updateAccountDto: {
        name,
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error('Failed to update account:', error);
    return json({ error: 'Failed to update account. Please try again.' }, { status: 500 });
  }
});

export default function EditAccountPage() {
  const theme = useTheme();
  const { account } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
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
      <Title>Edit Account</Title>
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
          <FormGroup sx={{ mb: 4 }}>
            <TextField
              label="Name"
              name="name"
              defaultValue={account.name}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: (theme) => theme.palette.primary.main,
                    },
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                  },
                },
              }}
            />
          </FormGroup>
          <FormGroup sx={{ mb: 4 }}>
            <TextField
              label="Username"
              value={account.username}
              disabled
              InputLabelProps={{ shrink: Boolean(account.username) }}
            />
          </FormGroup>
          <FormGroup sx={{ mb: 4 }}>
            <TextField
              label="Server URL"
              value={stripSchema(account.serverURL)}
              disabled
              InputLabelProps={{ shrink: true }}
            />
          </FormGroup>
          <FormGroup sx={{ mb: 4 }}>
            <TextField
              label="Account URL"
              value={account.accountURL}
              disabled
              InputLabelProps={{ shrink: Boolean(account.accountURL) }}
            />
          </FormGroup>
          <FormGroup sx={{ mb: 4 }}>
            <TextField
              label="Avatar URL"
              value={account.avatarURL}
              disabled
              InputLabelProps={{ shrink: Boolean(account.avatarURL) }}
            />
          </FormGroup>
          <FormGroup sx={{ mb: 4 }}>
            <TextField label="Timezone" value={account.timezone} disabled InputLabelProps={{ shrink: true }} />
          </FormGroup>
          {account.accountName && (
            <Typography component="p">
              Connected to{' '}
              <Link href={account.accountURL || ''} target="_blank" rel="noopener noreferrer">
                {account.accountName}
              </Link>
            </Typography>
          )}
          {!account.accountName && <Typography component="p">Not connected to any account</Typography>}
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'right', mt: 3 }}>
            <Button
              variant="outlined"
              component={RemixLink}
              to="/settings/accounts"
              sx={{
                mr: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={isSubmitting}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Form>
      </Paper>

      <Snackbar
        open={errorSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error">{actionData?.error}</Alert>
      </Snackbar>
      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSuccessSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success">Account saved.</Alert>
      </Snackbar>
    </Container>
  );
}
