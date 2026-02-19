import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminAccountItemDto } from '@analytodon/rest-client';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import {
  Button,
  Chip,
  Container,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { DataTablePaper } from '~/components/Layout/styles';
import { StyledTextField } from '~/components/StyledFormElements';
import { createAdminApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon - Account Browser' }];
};

export const handle = {
  i18n: 'routes.admin.accounts',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || undefined;
  const isActive = url.searchParams.get('isActive');
  const setupComplete = url.searchParams.get('setupComplete');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);

  try {
    const adminApi = await createAdminApiWithAuth(request);
    const result = await adminApi.adminControllerGetAccounts({
      search,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      setupComplete: setupComplete !== null ? setupComplete === 'true' : undefined,
      page,
      limit,
    });
    return { accounts: result };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load admin accounts:', error);
    return { accounts: null };
  }
});

export default function AdminAccountBrowser() {
  const { t } = useTranslation('routes.admin.accounts');
  const { accounts } = useLoaderData<typeof loader>() as {
    accounts: { items: AdminAccountItemDto[]; total: number; page: number; limit: number; totalPages: number } | null;
  };
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const statusFilter = searchParams.get('isActive') ?? 'all';
  const setupFilter = searchParams.get('setupComplete') ?? 'all';
  const page = parseInt(searchParams.get('page') || '1', 10) - 1; // MUI is 0-based
  const rowsPerPage = parseInt(searchParams.get('limit') || '25', 10);

  const updateParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === 'all' || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 on filter changes
      if (!('page' in updates)) {
        params.delete('page');
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const handleSearchSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateParams({ search: search || null });
    },
    [search, updateParams],
  );

  if (!accounts) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography sx={{ textAlign: 'center', opacity: 0.8, py: 4 }}>{t('messages.loadError')}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'contents' }}>
          <StyledTextField
            placeholder={t('search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </form>
        <Select
          value={statusFilter}
          onChange={(e) => updateParams({ isActive: e.target.value })}
          size="small"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">{t('filters.statusAll')}</MenuItem>
          <MenuItem value="true">{t('filters.active')}</MenuItem>
          <MenuItem value="false">{t('filters.inactive')}</MenuItem>
        </Select>
        <Select
          value={setupFilter}
          onChange={(e) => updateParams({ setupComplete: e.target.value })}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">{t('filters.setupAll')}</MenuItem>
          <MenuItem value="true">{t('filters.setupComplete')}</MenuItem>
          <MenuItem value="false">{t('filters.setupIncomplete')}</MenuItem>
        </Select>
      </Stack>

      <DataTablePaper>
        {accounts.items.length === 0 ? (
          <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noAccounts')}</Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('columns.accountName')}</TableCell>
                    <TableCell>{t('columns.serverURL')}</TableCell>
                    <TableCell>{t('columns.ownerEmail')}</TableCell>
                    <TableCell>{t('columns.active')}</TableCell>
                    <TableCell>{t('columns.setupComplete')}</TableCell>
                    <TableCell>{t('columns.created')}</TableCell>
                    <TableCell>{t('columns.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.items.map((account) => (
                    <TableRow key={account.id} hover>
                      <TableCell>{account.accountName || account.name || '-'}</TableCell>
                      <TableCell>{account.serverURL}</TableCell>
                      <TableCell>{account.owner.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={account.isActive ? t('labels.yes') : t('labels.no')}
                          size="small"
                          color={account.isActive ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={account.setupComplete ? t('labels.yes') : t('labels.no')}
                          size="small"
                          color={account.setupComplete ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{new Date(account.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {account.setupComplete && (
                          <Button
                            component={Link}
                            to={`/dashboard?viewAs=${account.id}`}
                            size="small"
                            variant="outlined"
                            startIcon={<DashboardIcon />}
                          >
                            {t('actions.viewDashboard')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={accounts.total}
              page={page}
              onPageChange={(_, newPage) => updateParams({ page: String(newPage + 1) })}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                updateParams({ limit: e.target.value, page: '1' });
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </DataTablePaper>
    </Container>
  );
}
