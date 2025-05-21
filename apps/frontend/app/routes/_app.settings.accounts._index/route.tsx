import * as React from 'react';

import { AccountResponseDto } from '@analytodon/rest-client';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReconnectIcon from '@mui/icons-material/Sync';
import {
  Alert,
  Box,
  Button,
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
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, redirect, useActionData, useLoaderData, useNavigate, useSubmit } from '@remix-run/react';
import { DataTablePaper } from '~/components/Layout/styles';
import Title from '~/components/Title';
import { createAccountsApiWithAuth } from '~/services/api.server';
import { formatDate } from '~/utils/formatters';
import { requireUser, withSessionHandling } from '~/utils/session.server';
import { stripSchema } from '~/utils/url';

export const meta: MetaFunction = () => {
  return [{ title: 'Accounts - Analytodon' }];
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  try {
    const accountsApi = await createAccountsApiWithAuth(request);
    const accounts = await accountsApi.accountsControllerFindAll();

    return {
      accounts,
      user,
      canAddAccount: (user.maxAccounts ?? 0) - (accounts?.length ?? 0) > 0,
    };
  } catch (error) {
    console.error('Failed to load accounts:', error);
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
  const action = formData.get('_action') as string;
  const accountId = formData.get('accountId') as string;

  if (!accountId) {
    return new Response(JSON.stringify({ error: 'Account ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const accountsApi = await createAccountsApiWithAuth(request);

  try {
    if (action === 'delete') {
      await accountsApi.accountsControllerRemove({ id: accountId });
      return { success: 'Account deleted successfully' };
    } else if (action === 'reconnect') {
      const response = await accountsApi.accountsControllerConnect({
        id: accountId,
        body: {},
      });

      if (response.redirectUrl) {
        return redirect(response.redirectUrl);
      }

      return new Response(JSON.stringify({ error: 'Failed to get reconnection URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'nvalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`Failed to ${action} account:`, error);
    return new Response(JSON.stringify({ error: `Failed to ${action} account. Please try again.` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

export default function AccountsPage() {
  const { accounts, user, canAddAccount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const theme = useTheme();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<AccountResponseDto | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  const handleEdit = (accountId: string) => {
    navigate(`/settings/accounts/${accountId}`);
  };

  const handleReconnect = (accountId: string) => {
    const formData = new FormData();
    formData.append('_action', 'reconnect');
    formData.append('accountId', accountId);
    submit(formData, { method: 'post' });
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
      <Title>Manage Your Accounts</Title>

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
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Username
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Server
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Timezone
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Added
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
                  <TableCell>{formatDate(account.createdAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      title="Reconnect"
                      onClick={() => handleReconnect(account.id)}
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <ReconnectIcon />
                    </IconButton>
                    <IconButton
                      title="Edit"
                      onClick={() => handleEdit(account.id)}
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      title="Delete"
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
          <Button
            variant="contained"
            component={Link}
            to="/accounts/connect"
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            Add Account
          </Button>
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
        {accounts.length} / {user.maxAccounts} accounts used
      </Typography>

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
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete the account{' '}
            <strong>{accountToDelete?.name || accountToDelete?.accountName || accountToDelete?.id}</strong> and all
            related analytics data. This operation cannot be undone!
          </DialogContentText>
          <DialogContentText sx={{ mt: 1 }}>
            To continue type <strong>delete</strong> into the field below:
          </DialogContentText>
          <FormGroup>
            <TextField
              margin="normal"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              required
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
          {actionData?.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {actionData.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ mb: 1, mr: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleteConfirmText !== 'delete'}
            color="error"
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
