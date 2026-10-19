import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { FollowerServersDto } from '@analytodon/rest-client';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import { Box, Chip, Link, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataTablePaper } from '~/components/Layout/styles';
import Title from '~/components/Title';
import { formatDate, formatNumber } from '~/utils/formatters';

const DOMAIN_PATTERN = /^[a-z0-9.-]+(:\d+)?$/i;

const formatShare = (share: number, digits = 1) => `${(share * 100).toFixed(digits)}%`;

const StatBox: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 2, py: 1.5, minWidth: 0 }}>
    <Typography sx={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 }}>{value}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', overflowWrap: 'anywhere' }}>
      {label}
    </Typography>
  </Box>
);

interface BarRowProps {
  label: React.ReactNode;
  count: number;
  share: number;
  width: number;
  color: string;
  trackColor: string;
  variant?: 'home' | 'other';
}

const BarRow: React.FC<BarRowProps> = ({ label, count, share, width, color, trackColor, variant }) => (
  <Box
    role="listitem"
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr auto', sm: '200px 1fr 120px' },
      alignItems: 'center',
      columnGap: { xs: 1, sm: 1.5 },
      rowGap: 0.5,
      fontSize: '0.875rem',
    }}
  >
    <Box
      sx={{
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontWeight: variant === 'home' ? 600 : undefined,
        color: variant === 'other' ? 'text.secondary' : undefined,
      }}
    >
      {label}
    </Box>
    <Box
      sx={{
        gridColumn: { xs: '1 / -1', sm: 'auto' },
        gridRow: { xs: 2, sm: 'auto' },
        height: { xs: 12, sm: 18 },
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: trackColor,
      }}
    >
      <Box sx={{ height: '100%', width: `${width}%`, borderRadius: 1, backgroundColor: color }} />
    </Box>
    <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
      <Box component="span" sx={{ fontWeight: 600 }}>
        {formatNumber(count)}
      </Box>
      <Box component="span" sx={{ color: 'text.secondary', ml: 0.75 }}>
        {formatShare(share)}
      </Box>
    </Box>
  </Box>
);

const ServerName: React.FC<{ domain: string }> = ({ domain }) =>
  DOMAIN_PATTERN.test(domain) ? (
    <Link
      href={`https://${domain}`}
      target="_blank"
      rel="noopener noreferrer"
      color="inherit"
      underline="hover"
      title={domain}
    >
      {domain}
    </Link>
  ) : (
    <span title={domain}>{domain}</span>
  );

const FollowerServers: React.FC<{ data: FollowerServersDto | null }> = ({ data }) => {
  const { t } = useTranslation('routes.followers');
  const theme = useTheme();

  const isDark = theme.palette.mode === 'dark';
  const colors = {
    bar: isDark ? '#6f93a4' : theme.palette.secondary.main,
    home: isDark ? '#a9cbdb' : theme.palette.primary.dark,
    other: isDark ? '#546e7a' : '#b0bec5',
    track: alpha(theme.palette.primary.main, isDark ? 0.1 : 0.08),
  };

  const top = data?.top ?? [];
  const other = data?.other;
  const hasData = data?.status === 'available' && (data.serverCount ?? 0) > 0;

  const renderContent = () => {
    if (!data || data.status === 'pending') {
      return <EmptyState text={t('servers.empty.pending')} />;
    }
    if (data.status === 'hidden') {
      return <EmptyState text={t('servers.empty.hidden')} />;
    }
    if (!hasData) {
      return <EmptyState text={t('servers.empty.noFollowers')} />;
    }

    const homeServer = data.homeServer ?? '';
    const homeShare = data.homeShare ?? 0;
    const serverCount = data.serverCount ?? 0;
    const topThreeShare = top.slice(0, 3).reduce((sum, { share }) => sum + share, 0);
    const maxCount = Math.max(...top.map(({ count }) => count), other?.count ?? 0, 1);
    const leader = top[0];

    // Trans parses markup in the interpolated string, so strip angle brackets from server-provided domains
    const plain = (value: string) => value.replace(/[<>]/g, '');
    const insightValues = {
      topServer: plain(leader.domain),
      topShare: formatShare(leader.share, 0),
      homeServer: plain(homeServer),
      homeShare: formatShare(homeShare, 0),
      count: serverCount,
    };
    let insightKey = 'servers.insight.topAndHome';
    if (leader.domain === homeServer) {
      insightKey = 'servers.insight.homeIsTop';
    } else if (homeShare === 0) {
      insightKey = 'servers.insight.topOnly';
    }

    return (
      <>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            borderRadius: 1,
            px: 2,
            py: 1.5,
            mb: 2.5,
            backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.08),
          }}
        >
          <TipsAndUpdatesOutlinedIcon sx={{ color: 'primary.main', flexShrink: 0, mt: '1px' }} fontSize="small" />
          <Typography sx={{ fontSize: '0.9375rem', minWidth: 0, overflowWrap: 'anywhere' }}>
            <Trans t={t} i18nKey={insightKey} values={insightValues} components={{ b: <strong /> }} />
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
            mb: 3,
            '& > :last-child': { gridColumn: { xs: '1 / -1', sm: 'auto' } },
          }}
        >
          <StatBox value={formatNumber(serverCount)} label={t('servers.stats.servers', { count: serverCount })} />
          <StatBox value={formatShare(homeShare, 0)} label={t('servers.stats.home', { homeServer })} />
          <StatBox value={formatShare(topThreeShare, 0)} label={t('servers.stats.topThree')} />
        </Box>

        <Box role="list" aria-label={t('servers.title')} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {top.map(({ domain, count, share }) => {
            const isHome = domain === homeServer;
            return (
              <BarRow
                key={domain}
                label={
                  <>
                    <ServerName domain={domain} />
                    {isHome && (
                      <Chip
                        label={t('servers.yourServer')}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ ml: 0.75, height: 18, fontSize: '0.6875rem', fontWeight: 600 }}
                      />
                    )}
                  </>
                }
                count={count}
                share={share}
                width={(count / maxCount) * 100}
                color={isHome ? colors.home : colors.bar}
                trackColor={colors.track}
                variant={isHome ? 'home' : undefined}
              />
            );
          })}
          {other && other.servers > 0 && (
            <BarRow
              label={t('servers.otherServers', { count: other.servers })}
              count={other.count}
              share={other.share}
              width={(other.count / maxCount) * 100}
              color={colors.other}
              trackColor={colors.track}
              variant="other"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, fontSize: '0.8125rem' }}>
          {t('servers.basedOn', {
            sampled: formatNumber(data.sampledFollowers ?? 0),
            total: formatNumber(data.totalFollowers ?? 0),
          })}{' '}
          {(data.sampledFollowers ?? 0) < (data.totalFollowers ?? 0) && t('servers.sampleNote')}
        </Typography>
      </>
    );
  };

  return (
    <DataTablePaper sx={{ p: 2, pb: 2.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          columnGap: 1,
        }}
      >
        <Title>{t('servers.title')}</Title>
        {data?.day && data.status !== 'pending' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {/* Snapshot days are stored as UTC dates, so format without the user's timezone */}
            {t('servers.snapshot', { date: formatDate(data.day) })}
          </Typography>
        )}
      </Box>
      {renderContent()}
    </DataTablePaper>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <Typography sx={{ textAlign: 'center', py: 4, px: 2, opacity: 0.8 }}>{text}</Typography>
);

export default FollowerServers;
