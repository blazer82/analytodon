import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { UserResponseDto } from '@analytodon/rest-client';
import DashboardIcon from '@mui/icons-material/Dashboard';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormGroup,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link as RemixLink, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { DataTablePaper, EnhancedPaper } from '~/components/Layout/styles';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';
import { createUsersApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

// Extended type until REST client is regenerated
interface AccountSummary {
  id: string;
  serverURL: string;
  accountName?: string;
  username?: string;
  isActive: boolean;
  setupComplete: boolean;
  createdAt: string;
}

interface UserDetail extends UserResponseDto {
  emailVerified?: boolean;
  lastLoginAt?: string;
  timezone?: string;
  locale?: string;
  maxAccounts?: number;
  accountsCount?: number;
  accounts?: AccountSummary[];
}

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon - User Detail' }];
};

export const handle = {
  i18n: 'routes.admin.user-detail',
};

export const loader = withSessionHandling(async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  const { userId } = params;
  if (!userId) {
    throw redirect('/admin/users');
  }

  try {
    const usersApi = await createUsersApiWithAuth(request);
    const userDetail = await usersApi.usersControllerFindUserById({ id: userId });
    return { userDetail };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load user:', error, { userId });
    throw redirect('/admin/users');
  }
});

export const action = withSessionHandling(async ({ request, params }: ActionFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  const { userId } = params;
  if (!userId) {
    return json({ error: 'User ID is required' }, { status: 400 });
  }

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const isActive = formData.get('isActive') === 'true';
  const emailVerified = formData.get('emailVerified') === 'true';
  const maxAccountsStr = formData.get('maxAccounts') as string;
  const timezone = formData.get('timezone') as string;
  const password = formData.get('password') as string;

  const updateDto: Record<string, unknown> = {
    email,
    role,
    isActive,
    emailVerified,
  };

  if (maxAccountsStr !== '') {
    updateDto.maxAccounts = parseInt(maxAccountsStr, 10);
  }
  if (timezone) {
    updateDto.timezone = timezone;
  }
  if (password) {
    updateDto.password = password;
  }

  try {
    const usersApi = await createUsersApiWithAuth(request);
    await usersApi.usersControllerUpdateUser({
      id: userId,
      updateUserDto: updateDto as Parameters<typeof usersApi.usersControllerUpdateUser>[0]['updateUserDto'],
    });
    return json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to update user:', error, { userId });
    return json({ error: 'errors.failedToUpdate' }, { status: 500 });
  }
});

export default function AdminUserDetail() {
  const { t } = useTranslation('routes.admin.user-detail');
  const { userDetail } = useLoaderData<typeof loader>() as { userDetail: UserDetail };
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [errorSnackbarOpen, setErrorSnackbarOpen] = React.useState(!!actionData?.error);
  const [successSnackbarOpen, setSuccessSnackbarOpen] = React.useState(!!actionData?.success);

  React.useEffect(() => {
    setErrorSnackbarOpen(!!actionData?.error);
    setSuccessSnackbarOpen(!!actionData?.success);
  }, [actionData]);

  const accounts = (userDetail.accounts ?? []) as AccountSummary[];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, animation: 'fadeIn 0.6s ease-out' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        {t('sections.userInfo')}
      </Typography>

      <EnhancedPaper sx={{ mb: 4 }}>
        <Form method="post">
          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.email')}
              name="email"
              type="email"
              defaultValue={userDetail.email}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('form.role')}
            </Typography>
            <Select name="role" defaultValue={userDetail.role} size="small" fullWidth>
              <MenuItem value="admin">{t('form.roleAdmin')}</MenuItem>
              <MenuItem value="account-owner">{t('form.roleAccountOwner')}</MenuItem>
            </Select>
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('form.active')}
            </Typography>
            <Select name="isActive" defaultValue={String(userDetail.isActive)} size="small" fullWidth>
              <MenuItem value="true">{t('form.activeYes')}</MenuItem>
              <MenuItem value="false">{t('form.activeNo')}</MenuItem>
            </Select>
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('form.emailVerified')}
            </Typography>
            <Select
              name="emailVerified"
              defaultValue={String(userDetail.emailVerified ?? false)}
              size="small"
              fullWidth
            >
              <MenuItem value="true">{t('form.emailVerifiedYes')}</MenuItem>
              <MenuItem value="false">{t('form.emailVerifiedNo')}</MenuItem>
            </Select>
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.maxAccounts')}
              name="maxAccounts"
              type="number"
              defaultValue={userDetail.maxAccounts ?? ''}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0 }}
              fullWidth
            />
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.timezone')}
              name="timezone"
              defaultValue={userDetail.timezone ?? ''}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.newPassword')}
              name="password"
              type="password"
              helperText={t('form.newPasswordHelp')}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </FormGroup>

          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('form.locale')}: {userDetail.locale ?? '-'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('form.lastLogin')}:{' '}
              {userDetail.lastLoginAt ? new Date(userDetail.lastLoginAt).toLocaleString() : t('form.never')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('form.created')}: {new Date(userDetail.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('form.updated')}: {new Date(userDetail.updatedAt).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'right', mt: 3 }}>
            <StyledButton variant="outlined" component={RemixLink} to="/admin/users" sx={{ mr: 2 }}>
              {t('actions.back')}
            </StyledButton>
            <StyledButton variant="contained" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('actions.saving') : t('actions.save')}
            </StyledButton>
          </Box>
        </Form>
      </EnhancedPaper>

      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        {t('sections.accounts')}
      </Typography>

      <DataTablePaper>
        {accounts.length === 0 ? (
          <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noAccounts')}</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('columns.accountName')}</TableCell>
                  <TableCell>{t('columns.serverURL')}</TableCell>
                  <TableCell>{t('columns.username')}</TableCell>
                  <TableCell>{t('columns.setupComplete')}</TableCell>
                  <TableCell>{t('columns.active')}</TableCell>
                  <TableCell>{t('columns.created')}</TableCell>
                  <TableCell>{t('columns.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.accountName ?? '-'}</TableCell>
                    <TableCell>{account.serverURL}</TableCell>
                    <TableCell>{account.username ?? '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={account.setupComplete ? t('labels.yes') : t('labels.no')}
                        size="small"
                        color={account.setupComplete ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.isActive ? t('labels.yes') : t('labels.no')}
                        size="small"
                        color={account.isActive ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{new Date(account.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {account.setupComplete && (
                        <Button
                          component={RemixLink}
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
        )}
      </DataTablePaper>

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
        <Alert severity="success">{t('success.userSaved')}</Alert>
      </Snackbar>
    </Container>
  );
}
