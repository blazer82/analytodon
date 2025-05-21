import * as React from 'react';

import type { ChartDataPointDto, FavoritedTootDto, FavoritesKpiDto, TotalSnapshotDto } from '@analytodon/rest-client';
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
import { createFavoritesApiWithAuth } from '~/services/api.server';
import { getKPITrend } from '~/utils/getKPITrend';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Favorites Analytics - Analytodon' }];
};

interface LoaderData {
  weeklyKPI: FavoritesKpiDto | null;
  monthlyKPI: FavoritesKpiDto | null;
  yearlyKPI: FavoritesKpiDto | null;
  total: TotalSnapshotDto | null;
  chart: ChartDataPointDto[];
  topToots: Toot[];
  initialTimeframe: Timeframe;
  accountId: string | null;
}

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!;
  const activeAccountId = session.get('activeAccountId') as string | undefined;

  const currentAccount = activeAccountId
    ? user.accounts.find((acc) => acc.id === activeAccountId)
    : user.accounts.length > 0
      ? user.accounts[0]
      : null;

  if (!currentAccount || !currentAccount.id) {
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
  const accountId = currentAccount.id;

  const url = new URL(request.url);
  const timeframeParam = (url.searchParams.get('timeframe') as Timeframe) || 'last30days';

  try {
    const favoritesApi = await createFavoritesApiWithAuth(request);

    const [weeklyKPI, monthlyKPI, yearlyKPI, total, chartData, topTootsData] = await Promise.all([
      favoritesApi.favoritesControllerGetWeeklyKpi({ accountId }).catch(() => null),
      favoritesApi.favoritesControllerGetMonthlyKpi({ accountId }).catch(() => null),
      favoritesApi.favoritesControllerGetYearlyKpi({ accountId }).catch(() => null),
      favoritesApi.favoritesControllerGetTotalSnapshot({ accountId }).catch(() => null),
      favoritesApi.favoritesControllerGetChartData({ accountId, timeframe: timeframeParam }).catch(() => []),
      favoritesApi.favoritesControllerGetTopTootsByFavorites({ accountId, timeframe: timeframeParam }).catch(() => []),
    ]);

    const topToots: Toot[] = (topTootsData || []).map((toot: FavoritedTootDto) => ({
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
    console.error('Failed to load favorites data:', error);
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

export default function FavoritesPage() {
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

  const rootData = useRouteLoaderData<{ ENV: { SUPPORT_EMAIL: string } }>('root');
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || 'support@analytodon.com';

  const chartData = fetcher.data?.chart ?? initialChart;
  const topTootsData = fetcher.data?.topToots ?? initialTopToots;
  const isLoadingData = fetcher.state === 'loading';

  const handleTimeframeChange = React.useCallback(
    (newTimeframe: Timeframe) => {
      setCurrentTimeframe(newTimeframe);
      if (accountId) {
        fetcher.load(`/favorites?index&timeframe=${newTimeframe}`);
      }
    },
    [fetcher, accountId],
  );

  const handleCSVDownload = React.useCallback(() => {
    if (accountId) {
      window.location.href = `/favorites/csv?accountId=${accountId}&timeframe=${currentTimeframe}`;
    }
  }, [accountId, currentTimeframe]);

  const hasChartData = React.useMemo(() => (chartData?.length ?? 0) > 0, [chartData]);
  const hasTopTootsData = React.useMemo(() => (topTootsData?.length ?? 0) > 0, [topTootsData]);

  if (!accountId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" align="center">
          Please select an account to view favorites analytics.
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
                title={weeklyKPI.isLastPeriod ? 'Last Week' : 'This Week'}
                subtitle="favorites"
                amount={weeklyKPI.currentPeriod ?? 0}
                trend={getKPITrend(weeklyKPI)}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>No weekly data.</Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {monthlyKPI ? (
              <TrendBox
                title={monthlyKPI.isLastPeriod ? 'Last Month' : 'This Month'}
                subtitle="favorites"
                amount={monthlyKPI.currentPeriod ?? 0}
                trend={getKPITrend(monthlyKPI)}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>No monthly data.</Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {yearlyKPI ? (
              <TrendBox
                title={yearlyKPI.isLastPeriod ? 'Last Year' : 'This Year'}
                subtitle="favorites"
                amount={yearlyKPI.currentPeriod ?? 0}
                trend={getKPITrend(yearlyKPI)}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>No yearly data.</Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 160 }}>
            {total ? (
              <TotalBox title="Total Favorites" amount={total.amount} date={total.day} />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 4 }}>No total data.</Typography>
            )}
          </TotalBoxPaper>
        </Grid>

        {/* Chart Section */}
        <Grid size={{ xs: 12 }} sx={{ mt: 5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <PeriodSelector timeframe={currentTimeframe} onChange={handleTimeframeChange} disabled={isLoadingData} />
            <IconButton
              title="Download CSV"
              aria-label="Download CSV"
              onClick={handleCSVDownload}
              disabled={isLoadingData}
            >
              <DownloadIcon />
            </IconButton>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <ChartPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 510, position: 'relative' }}>
            {hasChartData && chartData && <Chart data={chartData} type="bar" dataLabel="Favorites" />}
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
                <Typography>Loading chart data...</Typography>
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
                No data available for the selected timeframe.
                <br />
                Please select another time frame.
                <br />
                <br />
                If you&apos;ve just set up your account this message is expected.
                <br />
                We&apos;ll send you an email once your data is ready.
                <br />
                <br />
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                >
                  If this message persists please{' '}
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
                    contact support
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
              <TopToots data={topTootsData} title="Top Posts by Favorites" showBoosts={false} showReplies={false} />
            )}
            {!hasTopTootsData && !isLoadingData && (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>
                No top toots data available for the selected timeframe.
              </Typography>
            )}
            {/* Optional: Loading state for top toots if it's separate or part of isLoadingData */}
            {isLoadingData && !hasTopTootsData && (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>Loading top toots data...</Typography>
            )}
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
