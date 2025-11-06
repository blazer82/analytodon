import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { AccountResponseDto } from '@analytodon/rest-client';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReconnectIcon from '@mui/icons-material/Sync';
import {
  Alert,
  Box,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormGroup,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect, useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from '@remix-run/react';
import AccountSetup from '~/components/AccountSetup';
import AccountSetupComplete from '~/components/AccountSetupComplete';
import { DataTablePaper } from '~/components/Layout/styles';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';
import Title from '~/components/Title';
import { createAccountsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { formatDate } from '~/utils/formatters';
import { requireUser, withSessionHandling } from '~/utils/session.server';
import { stripSchema } from '~/utils/url';

export const meta: MetaFunction = () => {
  return [{ title: 'Accounts - Analytodon' }];
};

// Declare i18n namespaces for this route
export const handle = {
  i18n: ['routes.accounts', 'components.accountSetup', 'components.accountSetupComplete'],
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const setupComplete = url.searchParams.get('setup_complete') === 'true';

  try {
    const accountsApi = await createAccountsApiWithAuth(request);
    const accounts = await accountsApi.accountsControllerFindAll();

    return {
      accounts,
      user,
      canAddAccount: (user.maxAccounts ?? 0) - (accounts?.length ?? 0) > 0,
      showSetupCompleteDialog: setupComplete,
    };
  } catch (error) {
    logger.error('Failed to load accounts:', error);
    return {
      accounts: [],
      user,
      canAddAccount: (user.maxAccounts ?? 0) > 0,
    };
  }
});

export const action = withSessionHandling(async ({ request }: ActionFunctionArgs) => {
  await requireUser(request);
  const formData = await request.formData();
  const formAction = formData.get('_action') as string; // e.g., 'delete', 'reconnect', or 'connect' from AccountSetup

  // Check if it's an "add account" attempt (from AccountSetup's form)
  const serverURL = formData.get('serverURL') as string | null;
  const timezoneFormValue = formData.get('timezone') as string | null;

  if (formAction === 'connect' && serverURL && timezoneFormValue) {
    // Logic for adding account
    let timezone = timezoneFormValue;
    if (timezone && timezone.includes(' (')) {
      timezone = timezone.split(' (')[0];
    }

    if (!serverURL || !timezone) {
      return { error: 'errors.serverUrlAndTimezoneRequired' };
    }

    try {
      const accountsApi = await createAccountsApiWithAuth(request);
      const account = await accountsApi.accountsControllerCreate({
        createAccountDto: { serverURL, timezone },
      });
      const connectionResponse = await accountsApi.accountsControllerConnect({
        accountId: account.id,
        body: {},
      });
      // withSessionHandling HOF will add cookie to this redirect
      throw redirect(connectionResponse.redirectUrl);
    } catch (error) {
      if (error instanceof Response) {
        // Re-throw redirects to be handled by withSessionHandling
        throw error;
      }
      logger.error('Error connecting account in settings:', error, { serverURL, timezone });
      return {
        error: 'errors.failedToConnect',
      };
    }
  } else {
    // Existing logic for delete/reconnect based on accountId
    const accountId = formData.get('accountId') as string;
    if (!accountId) {
      return { error: 'errors.accountIdRequired' };
    }

    const accountsApi = await createAccountsApiWithAuth(request);
    try {
      if (formAction === 'delete') {
        await accountsApi.accountsControllerRemove({ accountId });
        return { success: 'success.accountDeleted' };
      } else if (formAction === 'reconnect') {
        const response = await accountsApi.accountsControllerConnect({
          accountId,
          body: {},
        });
        if (response.redirectUrl) {
          // withSessionHandling HOF will add cookie to this redirect
          throw redirect(response.redirectUrl);
        }
        return { error: 'errors.failedToGetReconnectionUrl' };
      }
      return { error: 'errors.invalidAction' };
    } catch (error) {
      if (error instanceof Response) {
        // Re-throw redirects to be handled by withSessionHandling
        throw error;
      }
      logger.error(`Failed to ${formAction} account:`, error, { accountId });
      return { error: 'errors.failedToAction', action: formAction };
    }
  }
});

export default function AccountsPage() {
  const { accounts, user, canAddAccount, showSetupCompleteDialog } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { t } = useTranslation('routes.accounts');
  const theme = useTheme();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<AccountResponseDto | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [reconnectDialogOpen, setReconnectDialogOpen] = React.useState(false);
  const [accountToReconnect, setAccountToReconnect] = React.useState<AccountResponseDto | null>(null);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = React.useState(false);
  const [showSetupComplete, setShowSetupComplete] = React.useState(showSetupCompleteDialog || false);

  React.useEffect(() => {
    // This effect handles showing the dialog if the loader flag is set,
    // and ensures the URL is cleaned up if the dialog is closed by the user.
    // It also prevents re-showing the dialog on subsequent renders unless the loader flag changes.
    if (showSetupCompleteDialog) {
      setShowSetupComplete(true);
      // Optionally, remove the query param from URL without reload to prevent re-showing on refresh
      // navigate('.', { replace: true }); // This might be too aggressive or cause issues with other state.
    }
  }, [showSetupCompleteDialog, navigate]);

  const handleEdit = (accountId: string) => {
    navigate(`/settings/accounts/${accountId}`);
  };

  const openReconnectDialog = (account: AccountResponseDto) => {
    setAccountToReconnect(account);
    setReconnectDialogOpen(true);
  };

  const handleReconnect = () => {
    if (accountToReconnect) {
      const formData = new FormData();
      formData.append('_action', 'reconnect');
      formData.append('accountId', accountToReconnect.id);
      submit(formData, { method: 'post' });
      setReconnectDialogOpen(false);
      setAccountToReconnect(null);
    }
  };

  const openDeleteDialog = (account: AccountResponseDto) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = () => {
    if (accountToDelete && deleteConfirmText === 'delete') {
      const formData = new FormData();
      formData.append('_action', 'delete');
      formData.append('accountId', accountToDelete.id);
      submit(formData, { method: 'post' });
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Title>{t('title')}</Title>

      <DataTablePaper>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="accounts table">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  {t('table.headers.name')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  {t('table.headers.username')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  {t('table.headers.server')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  {t('table.headers.timezone')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  {t('table.headers.added')}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                ></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account: AccountResponseDto) => (
                <TableRow
                  key={account.id}
                  sx={{
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor:
                        theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{account.name}</TableCell>
                  <TableCell>{account.username}</TableCell>
                  <TableCell>{stripSchema(account.serverURL)}</TableCell>
                  <TableCell>{account.timezone}</TableCell>
                  <TableCell>{formatDate(account.createdAt, user.timezone)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      title={t('table.actions.reconnect')}
                      onClick={() => openReconnectDialog(account)}
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <ReconnectIcon />
                    </IconButton>
                    <IconButton
                      title={t('table.actions.edit')}
                      onClick={() => handleEdit(account.id)}
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      title={t('table.actions.delete')}
                      onClick={() => openDeleteDialog(account)}
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTablePaper>

      {canAddAccount && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
          <StyledButton variant="contained" onClick={() => setAddAccountDialogOpen(true)}>
            {t('actions.addAccount')}
          </StyledButton>
        </Box>
      )}

      <Typography
        component="p"
        variant="body2"
        sx={{
          mt: 2,
          opacity: 0.8,
          fontWeight: 500,
        }}
      >
        {t('usage', { used: accounts.length, max: user.maxAccounts })}
      </Typography>

      {/* Add Account Dialog */}
      {addAccountDialogOpen && (
        <AccountSetup
          currentStep={0}
          initialServerURL={user.serverURLOnSignUp || ''}
          initialTimezone={user.timezone || ''}
          onClose={() => setAddAccountDialogOpen(false)}
          error={actionData?.error} // Assuming actionData.error is for the add account form if it was last submitted
        />
      )}

      {/* Account Setup Complete Dialog */}
      {showSetupComplete && (
        <AccountSetupComplete
          onClose={() => {
            setShowSetupComplete(false);
            // Optionally, navigate to clean up the URL query parameter
            navigate('/settings/accounts', { replace: true });
          }}
        />
      )}

      {/* Reconnect Account Dialog */}
      <Dialog
        open={reconnectDialogOpen}
        onClose={() => setReconnectDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle>{t('dialogs.reconnect.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('dialogs.reconnect.description', {
              name: accountToReconnect?.name || accountToReconnect?.accountName,
            })}
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>{t('dialogs.reconnect.helper')}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ mb: 1, mr: 2 }}>
          <StyledButton variant="outlined" onClick={() => setReconnectDialogOpen(false)}>
            {t('dialogs.reconnect.cancel')}
          </StyledButton>
          <StyledButton
            variant="contained"
            onClick={handleReconnect}
            color="primary"
            disabled={isSubmitting && navigation.formData?.get('_action') === 'reconnect'}
          >
            {isSubmitting && navigation.formData?.get('_action') === 'reconnect'
              ? t('dialogs.reconnect.confirming')
              : t('dialogs.reconnect.confirm')}
          </StyledButton>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle>{t('dialogs.delete.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('dialogs.delete.description', {
              name: accountToDelete?.name || accountToDelete?.accountName || accountToDelete?.id,
            })}
          </DialogContentText>
          <DialogContentText sx={{ mt: 1 }}>{t('dialogs.delete.instruction')}</DialogContentText>
          <FormGroup>
            <StyledTextField
              margin="normal"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              required
              fullWidth
            />
          </FormGroup>
          {actionData?.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t(actionData.error, { action: actionData.action })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ mb: 1, mr: 2 }}>
          <StyledButton variant="outlined" onClick={() => setDeleteDialogOpen(false)}>
            {t('dialogs.delete.cancel')}
          </StyledButton>
          <StyledButton
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={
              deleteConfirmText !== 'delete' || (isSubmitting && navigation.formData?.get('_action') === 'delete')
            }
            color="error"
          >
            {isSubmitting && navigation.formData?.get('_action') === 'delete'
              ? t('dialogs.delete.confirming')
              : t('dialogs.delete.confirm')}
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
