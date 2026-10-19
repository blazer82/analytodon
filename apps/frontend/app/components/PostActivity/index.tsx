import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { PostActivityDto } from '@analytodon/rest-client';
import { Box, Grid, Typography } from '@mui/material';
import Chart from '~/components/Chart';
import { EnhancedPaper } from '~/components/Layout/styles';
import Title from '~/components/Title';
import { TrendContent } from '~/components/TrendBox/ux';
import { formatNumber } from '~/utils/formatters';

import { formatBucketLabel, formatBucketTick, formatDay, formatDayRange, formatPostsPerDay } from './format';

const CARD_HEIGHT = { xs: 'auto', md: 280 } as const;

const Fact: React.FunctionComponent<{ value: string; label: string; title?: string }> = ({ value, label, title }) => (
  <Box title={title} sx={{ minWidth: 0 }}>
    <Typography component="p" sx={{ fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 }}>
      {value}
    </Typography>
    <Typography component="p" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
      {label}
    </Typography>
  </Box>
);

/**
 * Number of posts in the selected period: a total tile (with trend vs. the previous
 * period of equal length and a few facts) next to a bar chart per day/week/month.
 * Renders Grid items, so it is meant to be placed inside a `<Grid container>`.
 */
const PostActivity: React.FunctionComponent<{ activity: PostActivityDto | null; isLoading?: boolean }> = ({
  activity,
  isLoading,
}) => {
  const { t, i18n } = useTranslation('components.postActivity');
  const locale = i18n.language || 'en';

  const tickFormatter = React.useCallback(
    (time: string) => (activity ? formatBucketTick(time, activity.bucket, locale) : time),
    [activity, locale],
  );
  const labelFormatter = React.useCallback(
    (time: string) => {
      if (!activity) return time;
      const label = formatBucketLabel(time, activity.bucket, locale);
      return activity.bucket === 'week' ? t('chart.weekOf', { date: label }) : label;
    },
    [activity, locale, t],
  );

  if (!activity) return null;

  const {
    total,
    previousPeriodTotal,
    inProgress,
    trend,
    bucket,
    chart,
    dateFrom,
    dateTo,
    days,
    daysWithoutPosts,
    busiestDay,
  } = activity;
  const loadingSx = { opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s ease' };

  return (
    <React.Fragment>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <EnhancedPaper sx={{ p: 2, height: CARD_HEIGHT, ...loadingSx }} aria-busy={isLoading}>
          <Title>{t('title')}</Title>
          <Box>
            <Typography
              component="span"
              variant="h3"
              sx={{
                fontWeight: 700,
                background: (theme) =>
                  `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {formatNumber(total)}
            </Typography>
            {trend !== null && isFinite(trend) && (
              <TrendContent component="span" variant="h6" amount={trend}>
                ({trend >= 0 ? '+' : ''}
                {(trend * 100).toFixed(0)}%)
              </TrendContent>
            )}
          </Box>
          <Typography color="text.secondary" sx={{ fontSize: '0.9rem', mt: 0.5 }}>
            {formatDayRange(dateFrom, dateTo, locale)} ·{' '}
            {t(inProgress ? 'previousPeriodSoFar' : 'previousPeriod', { amount: formatNumber(previousPeriodTotal) })}
          </Typography>
          <Box
            sx={{
              mt: { xs: 2, md: 'auto' },
              pt: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 2,
            }}
          >
            <Fact value={formatPostsPerDay(total, days)} label={t('facts.perDay')} />
            <Fact
              value={formatNumber(busiestDay?.count ?? 0)}
              label={
                busiestDay
                  ? t('facts.busiestDayOn', { date: formatBucketTick(busiestDay.date, 'day', locale) })
                  : t('facts.busiestDay')
              }
              title={busiestDay ? formatDay(busiestDay.date, locale) : undefined}
            />
            <Fact value={formatNumber(daysWithoutPosts)} label={t('facts.daysWithoutPosts')} />
          </Box>
        </EnhancedPaper>
      </Grid>
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <EnhancedPaper sx={{ p: 2, height: CARD_HEIGHT, ...loadingSx }} aria-busy={isLoading}>
          <Title>{t(`chart.title.${bucket}`)}</Title>
          <Box sx={{ height: { xs: 220, md: 'auto' }, flex: { md: 1 }, minHeight: 0 }}>
            <Chart
              data={chart}
              dataLabel={t('chart.dataLabel')}
              type="bar"
              tickFormatter={tickFormatter}
              labelFormatter={labelFormatter}
            />
          </Box>
        </EnhancedPaper>
      </Grid>
    </React.Fragment>
  );
};

export default PostActivity;
