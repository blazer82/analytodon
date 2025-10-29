import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { RankedTootDto } from '@analytodon/rest-client';
import { Box, Container, Grid, Typography } from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { DataTablePaper } from '~/components/Layout/styles';
import PeriodSelector, { type Timeframe } from '~/components/PeriodSelector';
import TopToots, { type Toot } from '~/components/TopToots';
import { createTootsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Top Posts - Analytodon' }];
};

// Declare i18n namespace for this route
export const handle = {
  i18n: 'routes.topPosts',
};

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
      top: [],
      topByReplies: [],
      topByBoosts: [],
      topByFavorites: [],
      initialTimeframe: 'last30days' as Timeframe,
      accountId: null,
    };
  }
  const accountId = currentAccount.id;

  const url = new URL(request.url);
  const timeframeParam = (url.searchParams.get('timeframe') as Timeframe) || 'last30days';

  try {
    const tootsApi = await createTootsApiWithAuth(request);
    const topTootsResponse = await tootsApi.tootsControllerGetTopTootsSummary({
      accountId,
      timeframe: timeframeParam,
    });

    // Convert API response to Toot format for our components
    const mapToToots = (rankedToots: RankedTootDto[]): Toot[] => {
      return rankedToots.map((toot) => ({
        uri: toot.id,
        url: toot.url,
        content: toot.content,
        createdAt: toot.createdAt,
        repliesCount: toot.repliesCount,
        reblogsCount: toot.reblogsCount,
        favouritesCount: toot.favouritesCount,
      }));
    };

    return {
      top: mapToToots(topTootsResponse.top.data),
      topByReplies: mapToToots(topTootsResponse.topByReplies.data),
      topByBoosts: mapToToots(topTootsResponse.topByBoosts.data),
      topByFavorites: mapToToots(topTootsResponse.topByFavorites.data),
      initialTimeframe: timeframeParam,
      accountId,
    };
  } catch (error) {
    logger.error('Failed to load top posts data:', error);
    return {
      top: [],
      topByReplies: [],
      topByBoosts: [],
      topByFavorites: [],
      initialTimeframe: timeframeParam,
      accountId,
    };
  }
});

export default function TopPostsPage() {
  const { top, topByReplies, topByBoosts, topByFavorites, initialTimeframe, accountId } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof loader>();
  const [currentTimeframe, setCurrentTimeframe] = React.useState<Timeframe>(initialTimeframe);
  const { t } = useTranslation('routes.topPosts');

  const topData = fetcher.data?.top ?? top;
  const topByRepliesData = fetcher.data?.topByReplies ?? topByReplies;
  const topByBoostsData = fetcher.data?.topByBoosts ?? topByBoosts;
  const topByFavoritesData = fetcher.data?.topByFavorites ?? topByFavorites;
  const isLoadingData = fetcher.state === 'loading';

  const handleTimeframeChange = React.useCallback(
    (newTimeframe: Timeframe) => {
      setCurrentTimeframe(newTimeframe);
      if (accountId) {
        fetcher.load(`/top-posts?index&timeframe=${newTimeframe}`);
      }
    },
    [fetcher, accountId],
  );

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
        <Grid size={{ xs: 12 }} sx={{ mt: 5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <PeriodSelector timeframe={currentTimeframe} onChange={handleTimeframeChange} disabled={isLoadingData} />
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            {topData && topData.length > 0 ? (
              <TopToots data={topData} title={t('sections.topPosts')} />
            ) : (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
            )}
          </DataTablePaper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            {topByRepliesData && topByRepliesData.length > 0 ? (
              <TopToots
                data={topByRepliesData}
                title={t('sections.byReplies')}
                showBoosts={false}
                showFavorites={false}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
            )}
          </DataTablePaper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            {topByBoostsData && topByBoostsData.length > 0 ? (
              <TopToots
                data={topByBoostsData}
                title={t('sections.byBoosts')}
                showReplies={false}
                showFavorites={false}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
            )}
          </DataTablePaper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            {topByFavoritesData && topByFavoritesData.length > 0 ? (
              <TopToots
                data={topByFavoritesData}
                title={t('sections.byFavorites')}
                showReplies={false}
                showBoosts={false}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
            )}
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
