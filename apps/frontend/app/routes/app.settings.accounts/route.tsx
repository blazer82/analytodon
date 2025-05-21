import * as React from 'react';

import { AccountResponseDto } from '@analytodon/rest-client';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReconnectIcon from '@mui/icons-material/Sync';
import {
  Box,
  Button,
  Container,
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
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
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

export default function AccountsPage() {
  const { accounts, user, canAddAccount } = useLoaderData<typeof loader>();
  const theme = useTheme();

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
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <ReconnectIcon />
                    </IconButton>
                    <IconButton
                      title="Edit"
                      sx={{
                        transition: 'transform 0.2s ease',
                        '&:hover': { transform: 'scale(1.1)' },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      title="Delete"
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
    </Container>
  );
}
