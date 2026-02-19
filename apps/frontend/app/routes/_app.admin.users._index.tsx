import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { UserResponseDto } from '@analytodon/rest-client';
import SearchIcon from '@mui/icons-material/Search';
import {
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
import { Link, useLoaderData } from '@remix-run/react';
import { DataTablePaper } from '~/components/Layout/styles';
import { StyledTextField } from '~/components/StyledFormElements';
import { createUsersApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon - User Management' }];
};

export const handle = {
  i18n: 'routes.admin.users',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  try {
    const usersApi = await createUsersApiWithAuth(request);
    const users = await usersApi.usersControllerFindAllUsers();
    return { users };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load users:', error);
    return { users: null };
  }
});

export default function AdminUsersIndex() {
  const { t } = useTranslation('routes.admin.users');
  const { users } = useLoaderData<typeof loader>() as {
    users: UserResponseDto[] | null;
  };

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  if (!users) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography sx={{ textAlign: 'center', opacity: 0.8, py: 4 }}>{t('messages.loadError')}</Typography>
      </Container>
    );
  }

  const filteredUsers = users.filter((user) => {
    if (search && !user.email.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (roleFilter !== 'all' && user.role !== roleFilter) {
      return false;
    }
    if (statusFilter === 'active' && !user.isActive) {
      return false;
    }
    if (statusFilter === 'inactive' && user.isActive) {
      return false;
    }
    return true;
  });

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <StyledTextField
          placeholder={t('search.placeholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
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
        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">{t('filters.roleAll')}</MenuItem>
          <MenuItem value="admin">{t('filters.roleAdmin')}</MenuItem>
          <MenuItem value="account-owner">{t('filters.roleAccountOwner')}</MenuItem>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">{t('filters.statusAll')}</MenuItem>
          <MenuItem value="active">{t('filters.statusActive')}</MenuItem>
          <MenuItem value="inactive">{t('filters.statusInactive')}</MenuItem>
        </Select>
      </Stack>

      <DataTablePaper>
        {filteredUsers.length === 0 ? (
          <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noUsers')}</Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('columns.email')}</TableCell>
                    <TableCell>{t('columns.role')}</TableCell>
                    <TableCell>{t('columns.active')}</TableCell>
                    <TableCell>{t('columns.emailVerified')}</TableCell>
                    <TableCell>{t('columns.accounts')}</TableCell>
                    <TableCell>{t('columns.lastLogin')}</TableCell>
                    <TableCell>{t('columns.created')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Link
                          to={`/admin/users/${user.id}`}
                          style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {user.email}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role === 'admin' ? t('labels.admin') : t('labels.accountOwner')}
                          size="small"
                          color={user.role === 'admin' ? 'secondary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? t('labels.yes') : t('labels.no')}
                          size="small"
                          color={user.isActive ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.emailVerified ? t('labels.yes') : t('labels.no')}
                          size="small"
                          color={user.emailVerified ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{user.accountsCount ?? '-'}</TableCell>
                      <TableCell>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t('labels.never')}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </DataTablePaper>
    </Container>
  );
}
