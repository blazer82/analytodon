import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { ChartDataPointDto, RankedTootDto, TotalSnapshotDto } from '@analytodon/rest-client';
import { Box, Container, Grid, Link, Typography } from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import Chart from '~/components/Chart';
import { ChartPaper, DataTablePaper, TotalBoxPaper } from '~/components/Layout/styles';
import TopToots, { type Toot } from '~/components/TopToots';
import TotalBox from '~/components/TotalBox';
import { createFollowersApiWithAuth, createTootsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { resolveEffectiveAccountId } from '~/utils/active-account.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.dashboard',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!;
  const accountId = resolveEffectiveAccountId(request, user, session);

  if (!accountId) {
    return {
      total: null,
      chart: [],
      top: [],
    };
  }

  try {
    const followersApi = await createFollowersApiWithAuth(request);
    const tootsApi = await createTootsApiWithAuth(request);

    // Fetch all data in parallel
    const [totalSnapshotResponse, chartDataResponse, topTootsResponse] = await Promise.allSettled([
      followersApi.followersControllerGetTotalSnapshot({ accountId }),
      followersApi.followersControllerGetChartData({ accountId, timeframe: 'last30days' }),
      tootsApi.tootsControllerGetTopTootsSummary({ accountId, timeframe: 'last30days' }),
    ]);

    const total: TotalSnapshotDto | null =
      totalSnapshotResponse.status === 'fulfilled' ? totalSnapshotResponse.value : null;

    const chart: ChartDataPointDto[] = chartDataResponse.status === 'fulfilled' ? chartDataResponse.value : [];

    const topTootsRaw: RankedTootDto[] =
      topTootsResponse.status === 'fulfilled' && topTootsResponse.value.top ? topTootsResponse.value.top.data : [];

    const top: Toot[] = topTootsRaw.map((toot) => ({
      uri: toot.id, // Using id as uri for key compatibility
      url: toot.url,
      content: toot.content,
      createdAt: toot.createdAt,
      repliesCount: toot.repliesCount,
      reblogsCount: toot.reblogsCount,
      favouritesCount: toot.favouritesCount,
    }));

    return {
      total,
      chart,
      top,
    };
  } catch (error) {
    // If error is a Response (e.g. redirect from API client), HOF will handle it.
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load dashboard data:', error);
    return {
      total: null,
      chart: [],
      top: null,
    };
  }
});

export default function Dashboard() {
  const { t } = useTranslation('routes.dashboard');
  const { total, chart, top } = useLoaderData<typeof loader>() as {
    total: TotalSnapshotDto | null;
    chart: ChartDataPointDto[];
    top: Toot[] | null;
  };

  const [searchParams] = useSearchParams();
  const viewAs = searchParams.get('viewAs');
  const viewAsSuffix = viewAs ? `?viewAs=${viewAs}` : '';

  // Get ENV from the root loader data for support email
  const rootData = useRouteLoaderData<{ ENV: { SUPPORT_EMAIL: string } }>('root');
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || 'support@analytodon.com';

  const hasChart = React.useMemo(() => (chart?.length ?? 0) > 0, [chart]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, position: 'relative' }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <ChartPaper>
            {hasChart && chart && (
              <Chart title={t('chart.followersTitle')} data={chart} dataLabel={t('dataLabels.followers')} />
            )}
            {!hasChart && (
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
                {t('messages.noData')}
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
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper>
            {total && (
              <TotalBox
                title={t('totalBox.followersTitle')}
                amount={total.amount}
                date={total.day}
                linkText={t('totalBox.viewStats')}
                link={`/followers${viewAsSuffix}`}
              />
            )}
            {!total && (
              <Typography
                sx={{
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  opacity: 0.8,
                }}
              >
                {t('messages.noData')}
              </Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <DataTablePaper>
            {top && top.length > 0 ? (
              <TopToots
                data={top}
                title={t('topPosts.title')}
                linkText={t('topPosts.viewMore')}
                link={`/top-posts${viewAsSuffix}`}
              />
            ) : (
              <Typography
                sx={{
                  textAlign: 'center',
                  py: 4,
                  opacity: 0.8,
                }}
              >
                {t('messages.noData')}
              </Typography>
            )}
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
