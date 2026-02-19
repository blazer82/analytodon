import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { ChartDataPointDto, FollowersKpiDto, TotalSnapshotDto } from '@analytodon/rest-client';
import DownloadIcon from '@mui/icons-material/Download';
import { Box, Container, Fade, Grid, IconButton, Link, Typography } from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useFetcher, useLoaderData, useRouteLoaderData } from '@remix-run/react';
import Chart from '~/components/Chart';
import { ChartPaper, TotalBoxPaper } from '~/components/Layout/styles';
import PeriodSelector, { type Timeframe } from '~/components/PeriodSelector';
import TotalBox from '~/components/TotalBox';
import TrendBox from '~/components/TrendBox';
import { createFollowersApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { resolveEffectiveAccountId } from '~/utils/active-account.server';
import { useAdminViewAs } from '~/utils/admin-view';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Followers Analytics - Analytodon' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.followers',
};

interface LoaderData {
  weeklyKPI: FollowersKpiDto | null;
  monthlyKPI: FollowersKpiDto | null;
  yearlyKPI: FollowersKpiDto | null;
  total: TotalSnapshotDto | null;
  chart: ChartDataPointDto[];
  initialTimeframe: Timeframe;
  accountId: string | null;
}

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!;
  const accountId = resolveEffectiveAccountId(request, user, session);

  if (!accountId) {
    return {
      weeklyKPI: null,
      monthlyKPI: null,
      yearlyKPI: null,
      total: null,
      chart: [],
      initialTimeframe: 'last30days' as Timeframe,
      accountId: null,
    };
  }

  const url = new URL(request.url);
  const timeframeParam = (url.searchParams.get('timeframe') as Timeframe) || 'last30days';

  try {
    const followersApi = await createFollowersApiWithAuth(request);

    const [weeklyKPI, monthlyKPI, yearlyKPI, total, chartData] = await Promise.all([
      followersApi.followersControllerGetWeeklyKpi({ accountId }).catch(() => null),
      followersApi.followersControllerGetMonthlyKpi({ accountId }).catch(() => null),
      followersApi.followersControllerGetYearlyKpi({ accountId }).catch(() => null),
      followersApi.followersControllerGetTotalSnapshot({ accountId }).catch(() => null),
      followersApi.followersControllerGetChartData({ accountId, timeframe: timeframeParam }).catch(() => []),
    ]);

    return {
      weeklyKPI,
      monthlyKPI,
      yearlyKPI,
      total,
      chart: chartData,
      initialTimeframe: timeframeParam,
      accountId,
    };
  } catch (error) {
    // If error is a Response (e.g. redirect from API client), HOF will handle it.
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load followers data:', error);
    return {
      weeklyKPI: null,
      monthlyKPI: null,
      yearlyKPI: null,
      total: null,
      chart: [],
      initialTimeframe: timeframeParam,
      accountId,
    };
  }
});

export default function FollowersPage() {
  const {
    weeklyKPI,
    monthlyKPI,
    yearlyKPI,
    total,
    chart: initialChart,
    initialTimeframe,
    accountId,
  } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const [currentTimeframe, setCurrentTimeframe] = React.useState<Timeframe>(initialTimeframe);
  const { t } = useTranslation('routes.followers');
  const { buildLink } = useAdminViewAs();

  const rootData = useRouteLoaderData<{ ENV: { SUPPORT_EMAIL: string } }>('root');
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || 'support@analytodon.com';

  const chartData = fetcher.data?.chart ?? initialChart;
  const isLoadingChart = fetcher.state === 'loading';

  const handleTimeframeChange = React.useCallback(
    (newTimeframe: Timeframe) => {
      setCurrentTimeframe(newTimeframe);
      if (accountId) {
        fetcher.load(buildLink(`/followers?index&timeframe=${newTimeframe}`));
      }
    },
    [fetcher, accountId, buildLink],
  );

  const handleCSVDownload = React.useCallback(() => {
    if (accountId) {
      window.location.href = buildLink(`/followers/csv?accountId=${accountId}&timeframe=${currentTimeframe}`);
    }
  }, [accountId, currentTimeframe, buildLink]);

  const hasChartData = React.useMemo(() => (chartData?.length ?? 0) > 0, [chartData]);

  if (!accountId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" align="center">
          {t('messages.selectAccount')}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* KPI Boxes */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {weeklyKPI ? (
              <TrendBox
                title={weeklyKPI.isLastPeriod ? t('common:periods.lastWeek') : t('common:periods.thisWeek')}
                subtitle={t('kpi.followersGained')}
                amount={weeklyKPI.currentPeriod ?? 0}
                trend={weeklyKPI.trend}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>{t('common:messages.noWeeklyData')}</Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {monthlyKPI ? (
              <TrendBox
                title={monthlyKPI.isLastPeriod ? t('common:periods.lastMonth') : t('common:periods.thisMonth')}
                subtitle={t('kpi.followersGained')}
                amount={monthlyKPI.currentPeriod ?? 0}
                trend={monthlyKPI.trend}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>{t('common:messages.noMonthlyData')}</Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {yearlyKPI ? (
              <TrendBox
                title={yearlyKPI.isLastPeriod ? t('common:periods.lastYear') : t('common:periods.thisYear')}
                subtitle={t('kpi.followersGained')}
                amount={yearlyKPI.currentPeriod ?? 0}
                trend={yearlyKPI.trend}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>{t('common:messages.noYearlyData')}</Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {total ? (
              <TotalBox title={t('kpi.totalFollowers')} amount={total.amount} date={total.day} />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>{t('common:messages.noTotalData')}</Typography>
            )}
          </TotalBoxPaper>
        </Grid>

        {/* Chart Section */}
        <Grid size={{ xs: 12 }} sx={{ mt: 5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <PeriodSelector timeframe={currentTimeframe} onChange={handleTimeframeChange} disabled={isLoadingChart} />
            <IconButton
              title={t('common:actions.downloadCsv')}
              aria-label={t('common:actions.downloadCsv')}
              onClick={handleCSVDownload}
              disabled={isLoadingChart}
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <ChartPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 510, position: 'relative' }}>
            {/* Render Chart if data exists, it will be under the overlay if loading */}
            {hasChartData && chartData && <Chart data={chartData} dataLabel="Followers" />}

            {/* Loading Overlay: shown when loading. Covers chart or empty space. */}
            <Fade in={isLoadingChart} timeout={300}>
              <Box
                sx={(theme) => ({
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(30, 30, 30, 0.85)',
                  zIndex: 10, // Ensure overlay is on top
                  pointerEvents: isLoadingChart ? 'auto' : 'none', // Prevent interaction when not visible
                })}
              >
                <Typography>{t('common:messages.loadingChart')}</Typography>
              </Box>
            </Fade>

            {/* "No data" message: shown only if not loading AND no data */}
            {!hasChartData && !isLoadingChart && (
              <Typography
                sx={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%', // This ensures it fills the ChartPaper if no chart
                  opacity: 0.8,
                  px: 2,
                }}
              >
                {t('common:messages.noDataForTimeframe')}
                <br />
                {t('common:messages.selectAnother')}
                <br />
                <br />
                {t('common:messages.setupExpected')}
                <br />
                {t('common:messages.emailNotification')}
                <br />
                <br />
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                >
                  {t('common:messages.persistentIssue')}{' '}
                  <Link
                    href={`mailto:${supportEmail}?subject=Support`}
                    sx={{
                      textDecoration: 'none',
                      position: 'relative',
                      mx: 0.5,
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -2,
                        left: 0,
                        width: '100%',
                        height: '2px',
                        backgroundColor: 'primary.main',
                        borderRadius: '2px',
                        opacity: 0.7,
                      },
                      '&:hover': {
                        '&::after': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {t('common:messages.contactSupport')}
                  </Link>
                  .
                </Box>
              </Typography>
            )}
          </ChartPaper>
        </Grid>
      </Grid>
    </Container>
  );
}
