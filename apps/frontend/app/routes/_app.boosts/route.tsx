import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { BoostedTootDto, BoostsKpiDto, ChartDataPointDto, TotalSnapshotDto } from '@analytodon/rest-client';
import DownloadIcon from '@mui/icons-material/Download';
import { Box, Container, Fade, Grid, IconButton, Link, Typography } from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useFetcher, useLoaderData, useRouteLoaderData } from '@remix-run/react';
import Chart from '~/components/Chart';
import { ChartPaper, DataTablePaper, TotalBoxPaper } from '~/components/Layout/styles';
import PeriodSelector, { type Timeframe } from '~/components/PeriodSelector';
import TopToots, { type Toot } from '~/components/TopToots';
import TotalBox from '~/components/TotalBox';
import TrendBox from '~/components/TrendBox';
import { createBoostsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { resolveEffectiveAccountId } from '~/utils/active-account.server';
import { useAdminViewAs } from '~/utils/admin-view';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Boosts Analytics - Analytodon' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.boosts',
};

interface LoaderData {
  weeklyKPI: BoostsKpiDto | null;
  monthlyKPI: BoostsKpiDto | null;
  yearlyKPI: BoostsKpiDto | null;
  total: TotalSnapshotDto | null;
  chart: ChartDataPointDto[];
  topToots: Toot[];
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
      topToots: [],
      initialTimeframe: 'last30days' as Timeframe,
      accountId: null,
    };
  }

  const url = new URL(request.url);
  const timeframeParam = (url.searchParams.get('timeframe') as Timeframe) || 'last30days';

  try {
    const boostsApi = await createBoostsApiWithAuth(request);

    const [weeklyKPI, monthlyKPI, yearlyKPI, total, chartData, topTootsData] = await Promise.all([
      boostsApi.boostsControllerGetWeeklyKpi({ accountId }).catch(() => null),
      boostsApi.boostsControllerGetMonthlyKpi({ accountId }).catch(() => null),
      boostsApi.boostsControllerGetYearlyKpi({ accountId }).catch(() => null),
      boostsApi.boostsControllerGetTotalSnapshot({ accountId }).catch(() => null),
      boostsApi.boostsControllerGetChartData({ accountId, timeframe: timeframeParam }).catch(() => []),
      boostsApi.boostsControllerGetTopTootsByBoosts({ accountId, timeframe: timeframeParam }).catch(() => []),
    ]);

    const topToots: Toot[] = (topTootsData || []).map((toot: BoostedTootDto) => ({
      uri: toot.id,
      url: toot.url,
      content: toot.content,
      createdAt: toot.createdAt,
      repliesCount: toot.repliesCount,
      reblogsCount: toot.reblogsCount,
      favouritesCount: toot.favouritesCount,
    }));

    return {
      weeklyKPI,
      monthlyKPI,
      yearlyKPI,
      total,
      chart: chartData,
      topToots,
      initialTimeframe: timeframeParam,
      accountId,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load boosts data:', error);
    return {
      weeklyKPI: null,
      monthlyKPI: null,
      yearlyKPI: null,
      total: null,
      chart: [],
      topToots: [],
      initialTimeframe: timeframeParam,
      accountId,
    };
  }
});

export default function BoostsPage() {
  const {
    weeklyKPI,
    monthlyKPI,
    yearlyKPI,
    total,
    chart: initialChart,
    topToots: initialTopToots,
    initialTimeframe,
    accountId,
  } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const [currentTimeframe, setCurrentTimeframe] = React.useState<Timeframe>(initialTimeframe);
  const { t } = useTranslation('routes.boosts');
  const { buildLink } = useAdminViewAs();

  const rootData = useRouteLoaderData<{ ENV: { SUPPORT_EMAIL: string } }>('root');
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || 'support@analytodon.com';

  const chartData = fetcher.data?.chart ?? initialChart;
  const topTootsData = fetcher.data?.topToots ?? initialTopToots;
  const isLoadingData = fetcher.state === 'loading';

  const handleTimeframeChange = React.useCallback(
    (newTimeframe: Timeframe) => {
      setCurrentTimeframe(newTimeframe);
      if (accountId) {
        fetcher.load(buildLink(`/boosts?index&timeframe=${newTimeframe}`));
      }
    },
    [fetcher, accountId, buildLink],
  );

  const handleCSVDownload = React.useCallback(() => {
    if (accountId) {
      window.location.href = buildLink(`/boosts/csv?accountId=${accountId}&timeframe=${currentTimeframe}`);
    }
  }, [accountId, currentTimeframe, buildLink]);

  const hasChartData = React.useMemo(() => (chartData?.length ?? 0) > 0, [chartData]);
  const hasTopTootsData = React.useMemo(() => (topTootsData?.length ?? 0) > 0, [topTootsData]);

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
                subtitle={t('kpi.boostedPosts')}
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
                subtitle={t('kpi.boostedPosts')}
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
                subtitle={t('kpi.boostedPosts')}
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
              <TotalBox title={t('kpi.totalBoosts')} amount={total.amount} date={total.day} />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>{t('common:messages.noTotalData')}</Typography>
            )}
          </TotalBoxPaper>
        </Grid>

        {/* Chart Section */}
        <Grid size={{ xs: 12 }} sx={{ mt: 5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <PeriodSelector timeframe={currentTimeframe} onChange={handleTimeframeChange} disabled={isLoadingData} />
            <IconButton
              title={t('common:actions.downloadCsv')}
              aria-label={t('common:actions.downloadCsv')}
              onClick={handleCSVDownload}
              disabled={isLoadingData}
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <ChartPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 510, position: 'relative' }}>
            {hasChartData && chartData && <Chart data={chartData} type="bar" dataLabel="Boosts" />}
            <Fade in={isLoadingData} timeout={300}>
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
                  zIndex: 10,
                  pointerEvents: isLoadingData ? 'auto' : 'none',
                })}
              >
                <Typography>{t('common:messages.loadingChart')}</Typography>
              </Box>
            </Fade>
            {!hasChartData && !isLoadingData && (
              <Typography
                sx={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%',
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

        {/* Top Toots Section */}
        <Grid size={{ xs: 12 }} sx={{ mt: 3 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            {hasTopTootsData && topTootsData && (
              <TopToots data={topTootsData} title={t('topPosts.title')} showReplies={false} showFavorites={false} />
            )}
            {!hasTopTootsData && !isLoadingData && (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>
                {t('common:messages.noDataForTimeframe')}
              </Typography>
            )}
            {/* Optional: Loading state for top toots if it's separate or part of isLoadingData */}
            {isLoadingData && !hasTopTootsData && (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>
                {t('common:messages.loadingChart')}
              </Typography>
            )}
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
