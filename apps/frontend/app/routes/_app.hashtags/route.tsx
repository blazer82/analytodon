import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { HashtagEngagementDto, HashtagOverTimeDto, HashtagTopDto } from '@analytodon/rest-client';
import {
  Box,
  Container,
  Fade,
  Grid,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { ChartPaper, DataTablePaper } from '~/components/Layout/styles';
import MultiSeriesChart from '~/components/MultiSeriesChart';
import PeriodSelector, { type Timeframe } from '~/components/PeriodSelector';
import Title from '~/components/Title';
import { createHashtagsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { resolveEffectiveAccountId } from '~/utils/active-account.server';
import { useAdminViewAs } from '~/utils/admin-view';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Hashtags Analytics - Analytodon' }];
};

export const handle = {
  i18n: 'routes.hashtags',
};

interface LoaderData {
  topHashtags: HashtagTopDto[];
  overTime: HashtagOverTimeDto | null;
  engagement: HashtagEngagementDto[];
  mostEffective: HashtagEngagementDto[];
  initialTimeframe: Timeframe;
  accountId: string | null;
  serverUrl: string | null;
}

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!;
  const accountId = resolveEffectiveAccountId(request, user, session);

  if (!accountId) {
    return {
      topHashtags: [],
      overTime: null,
      engagement: [],
      mostEffective: [],
      initialTimeframe: 'last30days' as Timeframe,
      accountId: null,
      serverUrl: null,
    };
  }

  const url = new URL(request.url);
  const timeframeParam = (url.searchParams.get('timeframe') as Timeframe) || 'last30days';

  // Find the account's server URL for constructing hashtag links
  const account = user.accounts.find((acc) => acc.id === accountId);
  const serverUrl = account?.serverURL ?? null;

  try {
    const hashtagsApi = await createHashtagsApiWithAuth(request);

    const [topHashtags, overTime, engagement, mostEffective] = await Promise.all([
      hashtagsApi.hashtagsControllerGetTopHashtags({ accountId, timeframe: timeframeParam }).catch(() => []),
      hashtagsApi.hashtagsControllerGetOverTime({ accountId, timeframe: timeframeParam }).catch(() => null),
      hashtagsApi.hashtagsControllerGetEngagement({ accountId, timeframe: timeframeParam }).catch(() => []),
      hashtagsApi.hashtagsControllerGetMostEffective({ accountId, timeframe: timeframeParam }).catch(() => []),
    ]);

    return {
      topHashtags,
      overTime,
      engagement,
      mostEffective,
      initialTimeframe: timeframeParam,
      accountId,
      serverUrl,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load hashtags data:', error);
    return {
      topHashtags: [],
      overTime: null,
      engagement: [],
      mostEffective: [],
      initialTimeframe: timeframeParam,
      accountId,
      serverUrl,
    };
  }
});

function HashtagLink({ hashtag, serverUrl }: { hashtag: string; serverUrl: string | null }) {
  if (serverUrl) {
    const baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    return (
      <Link href={`${baseUrl}/tags/${hashtag}`} target="_blank" rel="noopener noreferrer" underline="hover">
        #{hashtag}
      </Link>
    );
  }
  return <>#{hashtag}</>;
}

export default function HashtagsPage() {
  const {
    topHashtags: initialTopHashtags,
    overTime: initialOverTime,
    engagement: initialEngagement,
    mostEffective: initialMostEffective,
    initialTimeframe,
    accountId,
    serverUrl,
  } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<LoaderData>();
  const [currentTimeframe, setCurrentTimeframe] = React.useState<Timeframe>(initialTimeframe);
  const { t } = useTranslation('routes.hashtags');
  const { buildLink } = useAdminViewAs();

  const topHashtags = fetcher.data?.topHashtags ?? initialTopHashtags;
  const overTime = fetcher.data?.overTime ?? initialOverTime;
  const engagement = fetcher.data?.engagement ?? initialEngagement;
  const mostEffective = fetcher.data?.mostEffective ?? initialMostEffective;
  const isLoadingData = fetcher.state === 'loading';

  const handleTimeframeChange = React.useCallback(
    (newTimeframe: Timeframe) => {
      setCurrentTimeframe(newTimeframe);
      if (accountId) {
        fetcher.load(buildLink(`/hashtags?index&timeframe=${newTimeframe}`));
      }
    },
    [fetcher, accountId, buildLink],
  );

  const hasTopHashtags = topHashtags.length > 0;
  const hasOverTimeData = overTime && overTime.data.length > 0;
  const hasEngagement = engagement.length > 0;
  const hasMostEffective = mostEffective.length > 0;

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
        {/* Period Selector */}
        <Grid size={{ xs: 12 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <PeriodSelector timeframe={currentTimeframe} onChange={handleTimeframeChange} disabled={isLoadingData} />
          </Box>
        </Grid>

        {/* Top Hashtags Table */}
        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Title>{t('sections.topHashtags')}</Title>
            {hasTopHashtags ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('table.hashtag')}</TableCell>
                      <TableCell align="right">{t('table.tootCount')}</TableCell>
                      <TableCell align="right">{t('table.repliesCount')}</TableCell>
                      <TableCell align="right">{t('table.reblogsCount')}</TableCell>
                      <TableCell align="right">{t('table.favouritesCount')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topHashtags.map((row) => (
                      <TableRow key={row.hashtag}>
                        <TableCell>
                          <HashtagLink hashtag={row.hashtag} serverUrl={serverUrl} />
                        </TableCell>
                        <TableCell align="right">{row.tootCount}</TableCell>
                        <TableCell align="right">{row.repliesCount}</TableCell>
                        <TableCell align="right">{row.reblogsCount}</TableCell>
                        <TableCell align="right">{row.favouritesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              !isLoadingData && (
                <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
              )
            )}
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
          </DataTablePaper>
        </Grid>

        {/* Usage Over Time Chart */}
        <Grid size={{ xs: 12 }}>
          <ChartPaper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 510, position: 'relative' }}>
            {hasOverTimeData && overTime ? (
              <MultiSeriesChart
                title={t('sections.usageOverTime')}
                data={overTime.data}
                seriesKeys={overTime.hashtags}
              />
            ) : (
              !isLoadingData && (
                <Typography
                  sx={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    height: '100%',
                    opacity: 0.8,
                  }}
                >
                  {t('messages.noData')}
                </Typography>
              )
            )}
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
          </ChartPaper>
        </Grid>

        {/* Engagement Table */}
        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Title>{t('sections.engagement')}</Title>
            {hasEngagement ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('table.hashtag')}</TableCell>
                      <TableCell align="right">{t('table.tootCount')}</TableCell>
                      <TableCell align="right">{t('table.totalEngagement')}</TableCell>
                      <TableCell align="right">{t('table.avgEngagement')}</TableCell>
                      <TableCell align="right">{t('table.repliesCount')}</TableCell>
                      <TableCell align="right">{t('table.reblogsCount')}</TableCell>
                      <TableCell align="right">{t('table.favouritesCount')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {engagement.map((row) => (
                      <TableRow key={row.hashtag}>
                        <TableCell>
                          <HashtagLink hashtag={row.hashtag} serverUrl={serverUrl} />
                        </TableCell>
                        <TableCell align="right">{row.tootCount}</TableCell>
                        <TableCell align="right">{row.totalEngagement}</TableCell>
                        <TableCell align="right">{row.avgEngagementPerToot}</TableCell>
                        <TableCell align="right">{row.repliesCount}</TableCell>
                        <TableCell align="right">{row.reblogsCount}</TableCell>
                        <TableCell align="right">{row.favouritesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              !isLoadingData && (
                <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
              )
            )}
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
          </DataTablePaper>
        </Grid>

        {/* Most Effective Table */}
        <Grid size={{ xs: 12 }}>
          <DataTablePaper sx={{ p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Title>{t('sections.mostEffective')}</Title>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
              {t('messages.mostEffectiveNote', { count: 2 })}
            </Typography>
            {hasMostEffective ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('table.hashtag')}</TableCell>
                      <TableCell align="right">{t('table.tootCount')}</TableCell>
                      <TableCell align="right">{t('table.totalEngagement')}</TableCell>
                      <TableCell align="right">{t('table.avgEngagement')}</TableCell>
                      <TableCell align="right">{t('table.repliesCount')}</TableCell>
                      <TableCell align="right">{t('table.reblogsCount')}</TableCell>
                      <TableCell align="right">{t('table.favouritesCount')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mostEffective.map((row) => (
                      <TableRow key={row.hashtag}>
                        <TableCell>
                          <HashtagLink hashtag={row.hashtag} serverUrl={serverUrl} />
                        </TableCell>
                        <TableCell align="right">{row.tootCount}</TableCell>
                        <TableCell align="right">{row.totalEngagement}</TableCell>
                        <TableCell align="right">{row.avgEngagementPerToot}</TableCell>
                        <TableCell align="right">{row.repliesCount}</TableCell>
                        <TableCell align="right">{row.reblogsCount}</TableCell>
                        <TableCell align="right">{row.favouritesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              !isLoadingData && (
                <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('messages.noData')}</Typography>
              )
            )}
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
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
