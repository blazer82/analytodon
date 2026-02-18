import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminStatsResponseDto } from '@analytodon/rest-client';
import { Box, Container, Grid, List, ListItem, ListItemText, Typography } from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import Chart from '~/components/Chart';
import type { ChartData } from '~/components/Chart';
import { ChartPaper, DataTablePaper, EnhancedPaper } from '~/components/Layout/styles';
import Title from '~/components/Title';
import { createAdminApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { formatNumber } from '~/utils/formatters';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon - Platform Overview' }];
};

export const handle = {
  i18n: 'routes.admin.dashboard',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  try {
    const adminApi = await createAdminApiWithAuth(request);
    const stats = await adminApi.adminControllerGetStats();
    return { stats };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load admin stats:', error);
    return { stats: null };
  }
});

interface KpiCardProps {
  label: string;
  value: number;
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <EnhancedPaper sx={{ height: '100%', minHeight: 120 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          background: (theme) =>
            `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {formatNumber(value)}
      </Typography>
    </EnhancedPaper>
  );
}

interface MetricRowProps {
  label: string;
  value: number;
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatNumber(value)}
      </Typography>
    </Box>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation('routes.admin.dashboard');
  const { stats } = useLoaderData<typeof loader>() as {
    stats: AdminStatsResponseDto | null;
  };

  const chartData: ChartData[] = React.useMemo(() => {
    if (!stats?.users?.registrations?.dailyBreakdown) return [];
    return stats.users.registrations.dailyBreakdown.map((item) => ({
      time: item.date,
      value: item.count,
    }));
  }, [stats]);

  if (!stats) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography sx={{ textAlign: 'center', opacity: 0.8, py: 4 }}>{t('messages.loadError')}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label={t('kpi.totalUsers')} value={stats.users.totalCount} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label={t('kpi.activeUsers')} value={stats.users.activeCount} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label={t('kpi.connectedAccounts')} value={stats.accounts.setupCompleteCount} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label={t('kpi.trackedToots')} value={stats.dataVolume.totalToots} />
        </Grid>

        {/* Registration Trend Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <ChartPaper>
            {chartData.length > 0 ? (
              <Chart
                title={t('sections.registrations')}
                data={chartData}
                dataLabel={t('labels.registrations')}
                type="bar"
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ opacity: 0.8 }}>{t('messages.noData')}</Typography>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Login Activity */}
        <Grid size={{ xs: 12, md: 4 }}>
          <EnhancedPaper sx={{ height: 240 }}>
            <Title>{t('sections.loginActivity')}</Title>
            <MetricRow label={t('labels.last7Days')} value={stats.users.loginActivity.last7Days} />
            <MetricRow label={t('labels.last30Days')} value={stats.users.loginActivity.last30Days} />
            <MetricRow label={t('labels.last90Days')} value={stats.users.loginActivity.last90Days} />
          </EnhancedPaper>
        </Grid>

        {/* User Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <EnhancedPaper>
            <Title>{t('sections.users')}</Title>
            <MetricRow label={t('labels.active')} value={stats.users.activeCount} />
            <MetricRow label={t('labels.inactive')} value={stats.users.inactiveCount} />
            <MetricRow label={t('labels.emailVerified')} value={stats.users.emailVerifiedCount} />
            <MetricRow label={t('labels.admins')} value={stats.users.roleBreakdown.admin} />
            <MetricRow label={t('labels.accountOwners')} value={stats.users.roleBreakdown.accountOwner} />
          </EnhancedPaper>
        </Grid>

        {/* Account Status */}
        <Grid size={{ xs: 12, md: 4 }}>
          <EnhancedPaper>
            <Title>{t('sections.accounts')}</Title>
            <MetricRow label={t('labels.active')} value={stats.accounts.activeCount} />
            <MetricRow label={t('labels.inactive')} value={stats.accounts.inactiveCount} />
            <MetricRow label={t('labels.setupComplete')} value={stats.accounts.setupCompleteCount} />
            <MetricRow label={t('labels.setupIncomplete')} value={stats.accounts.setupIncompleteCount} />
          </EnhancedPaper>
        </Grid>

        {/* Data Volume */}
        <Grid size={{ xs: 12, md: 4 }}>
          <EnhancedPaper>
            <Title>{t('sections.dataVolume')}</Title>
            <MetricRow label={t('labels.toots')} value={stats.dataVolume.totalToots} />
            <MetricRow label={t('labels.dailyAccountStats')} value={stats.dataVolume.totalDailyAccountStats} />
            <MetricRow label={t('labels.dailyTootStats')} value={stats.dataVolume.totalDailyTootStats} />
          </EnhancedPaper>
        </Grid>

        {/* Server Distribution */}
        <Grid size={{ xs: 12 }}>
          <DataTablePaper>
            <Title>{t('sections.serverDistribution')}</Title>
            {stats.accounts.serverDistribution.length > 0 ? (
              <List dense>
                {stats.accounts.serverDistribution.map((server) => (
                  <ListItem
                    key={server.serverURL}
                    sx={{
                      borderRadius: 1,
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <ListItemText primary={server.serverURL} primaryTypographyProps={{ fontWeight: 500 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatNumber(server.count)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ opacity: 0.8, py: 2 }}>{t('messages.noData')}</Typography>
            )}
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
