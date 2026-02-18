import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { AccountHealthResponseDto } from '@analytodon/rest-client';
import {
  Badge,
  Box,
  Chip,
  Container,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { DataTablePaper } from '~/components/Layout/styles';
import { createAdminApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon - Account Health' }];
};

export const handle = {
  i18n: 'routes.admin.accounts-health',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  try {
    const adminApi = await createAdminApiWithAuth(request);
    const health = await adminApi.adminControllerGetAccountHealth();
    return { health };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load account health:', error);
    return { health: null };
  }
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AdminAccountsHealth() {
  const { t } = useTranslation('routes.admin.accounts-health');
  const { health } = useLoaderData<typeof loader>() as {
    health: AccountHealthResponseDto | null;
  };
  const [tabIndex, setTabIndex] = React.useState(0);

  if (!health) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography sx={{ textAlign: 'center', opacity: 0.8, py: 4 }}>{t('messages.loadError')}</Typography>
      </Container>
    );
  }

  const staleCount = health.staleAccounts?.length ?? 0;
  const incompleteCount = health.incompleteAccounts?.length ?? 0;
  const abandonedCount = health.abandonedAccounts?.length ?? 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {health.generatedAt && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('labels.lastUpdated', { date: new Date(health.generatedAt).toLocaleString() })}
        </Typography>
      )}

      <DataTablePaper>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            label={
              <Badge
                badgeContent={staleCount}
                color={staleCount > 0 ? 'error' : 'default'}
                sx={{ '& .MuiBadge-badge': { ml: 1 } }}
              >
                <Box sx={{ pr: 1.5 }}>{t('tabs.stale')}</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge
                badgeContent={incompleteCount}
                color={incompleteCount > 0 ? 'error' : 'default'}
                sx={{ '& .MuiBadge-badge': { ml: 1 } }}
              >
                <Box sx={{ pr: 1.5 }}>{t('tabs.incomplete')}</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge
                badgeContent={abandonedCount}
                color={abandonedCount > 0 ? 'error' : 'default'}
                sx={{ '& .MuiBadge-badge': { ml: 1 } }}
              >
                <Box sx={{ pr: 1.5 }}>{t('tabs.abandoned')}</Box>
              </Badge>
            }
          />
        </Tabs>

        {/* Stale Accounts */}
        <TabPanel value={tabIndex} index={0}>
          {staleCount === 0 ? (
            <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noStaleAccounts')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('columns.account')}</TableCell>
                    <TableCell>{t('columns.server')}</TableCell>
                    <TableCell>{t('columns.owner')}</TableCell>
                    <TableCell>{t('columns.lastStats')}</TableCell>
                    <TableCell>{t('columns.daysSinceUpdate')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {health.staleAccounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell>{account.accountName || t('labels.unknown')}</TableCell>
                      <TableCell>{account.serverURL}</TableCell>
                      <TableCell>{account.ownerEmail}</TableCell>
                      <TableCell>
                        {account.lastStatsDate
                          ? new Date(account.lastStatsDate).toLocaleDateString()
                          : t('labels.noStats')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={account.daysSinceLastUpdate}
                          size="small"
                          color={account.daysSinceLastUpdate > 7 ? 'error' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Incomplete Accounts */}
        <TabPanel value={tabIndex} index={1}>
          {incompleteCount === 0 ? (
            <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noIncompleteAccounts')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('columns.account')}</TableCell>
                    <TableCell>{t('columns.server')}</TableCell>
                    <TableCell>{t('columns.owner')}</TableCell>
                    <TableCell>{t('columns.createdDate')}</TableCell>
                    <TableCell>{t('columns.daysSinceCreation')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {health.incompleteAccounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell>{account.accountName || t('labels.unknown')}</TableCell>
                      <TableCell>{account.serverURL}</TableCell>
                      <TableCell>{account.ownerEmail}</TableCell>
                      <TableCell>{new Date(account.createdDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={account.daysSinceCreation}
                          size="small"
                          color={account.daysSinceCreation > 30 ? 'error' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Abandoned Accounts */}
        <TabPanel value={tabIndex} index={2}>
          {abandonedCount === 0 ? (
            <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noAbandonedAccounts')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('columns.account')}</TableCell>
                    <TableCell>{t('columns.server')}</TableCell>
                    <TableCell>{t('columns.owner')}</TableCell>
                    <TableCell>{t('columns.lastLogin')}</TableCell>
                    <TableCell>{t('columns.deletionNotice')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {health.abandonedAccounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell>{account.accountName || t('labels.unknown')}</TableCell>
                      <TableCell>{account.serverURL}</TableCell>
                      <TableCell>{account.ownerEmail}</TableCell>
                      <TableCell>
                        {account.lastLoginDate
                          ? new Date(account.lastLoginDate).toLocaleDateString()
                          : t('labels.never')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={account.deletionNoticeSent ? t('labels.sent') : t('labels.notSent')}
                          size="small"
                          color={account.deletionNoticeSent ? 'default' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </DataTablePaper>
    </Container>
  );
}
