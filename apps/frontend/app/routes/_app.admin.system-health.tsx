import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type {
  JobStatusDto,
  RecentFailureDto,
  SystemHealthResponseDto,
  TimingMarginDetailDto,
  TimingMarginPairDto,
} from '@analytodon/rest-client';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Alert,
  Box,
  Chip,
  Collapse,
  Container,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  return [{ title: 'Analytodon - System Health' }];
};

export const handle = {
  i18n: 'routes.admin.system-health',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  try {
    const adminApi = await createAdminApiWithAuth(request);
    const health = await adminApi.adminControllerGetSystemHealth();
    return { health };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to load system health:', error);
    return { health: null };
  }
});

function getOverallStatus(health: SystemHealthResponseDto): 'success' | 'warning' | 'error' {
  const hasFailures = (health.recentFailures?.length ?? 0) > 0;
  const hasOverdue = health.jobStatuses?.some((j: JobStatusDto) => j.isOverdue) ?? false;
  const hasStuck = health.jobStatuses?.some((j: JobStatusDto) => j.lastStatus === 'stuck') ?? false;
  const hasStale =
    health.dataFreshness?.dailyAccountStats?.isStale ||
    health.dataFreshness?.dailyTootStats?.isStale ||
    health.dataFreshness?.toots?.isStale;

  if (hasStuck) return 'error';
  if (hasOverdue || hasStale || hasFailures) return 'warning';
  return 'success';
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

function TimingMarginRow({ pair }: { pair: TimingMarginPairDto }) {
  const { t } = useTranslation('routes.admin.system-health');
  const [open, setOpen] = React.useState(false);
  const summary = pair.last7Days;

  return (
    <>
      <TableRow>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>{pair.fetchJob}</TableCell>
        <TableCell>{pair.aggregateJob}</TableCell>
        <TableCell>{formatDuration(summary?.avgMarginMs)}</TableCell>
        <TableCell>{formatDuration(summary?.minMarginMs)}</TableCell>
        <TableCell>
          {summary?.overlapCount != null && summary.overlapCount > 0 ? (
            <Chip label={summary.overlapCount} size="small" color="error" />
          ) : (
            <Chip label={summary?.overlapCount ?? 0} size="small" color="success" />
          )}
        </TableCell>
        <TableCell>{summary?.sampleCount ?? 0}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('sections.marginDetails')}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('columns.aggregateStart')}</TableCell>
                    <TableCell>{t('columns.fetchEnd')}</TableCell>
                    <TableCell>{t('columns.margin')}</TableCell>
                    <TableCell>{t('columns.overlap')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.details?.map((detail: TimingMarginDetailDto, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {detail.aggregateStartedAt ? new Date(detail.aggregateStartedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        {detail.fetchCompletedAt ? new Date(detail.fetchCompletedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{formatDuration(detail.marginMs)}</TableCell>
                      <TableCell>
                        {detail.hadOverlap ? (
                          <Chip label={t('labels.yes')} size="small" color="error" />
                        ) : (
                          <Chip label={t('labels.no')} size="small" color="success" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function AdminSystemHealth() {
  const { t } = useTranslation('routes.admin.system-health');
  const { health } = useLoaderData<typeof loader>() as {
    health: SystemHealthResponseDto | null;
  };

  if (!health) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography sx={{ textAlign: 'center', opacity: 0.8, py: 4 }}>{t('messages.loadError')}</Typography>
      </Container>
    );
  }

  const status = getOverallStatus(health);
  const statusMessages = {
    success: t('status.healthy'),
    warning: t('status.warning'),
    error: t('status.critical'),
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {health.generatedAt && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('labels.lastUpdated', { date: new Date(health.generatedAt).toLocaleString() })}
        </Typography>
      )}

      {/* Overall Status Banner */}
      <Alert severity={status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'error'} sx={{ mb: 3 }}>
        {statusMessages[status]}
      </Alert>

      {/* Job Statuses */}
      <DataTablePaper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          {t('sections.jobStatuses')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('columns.jobName')}</TableCell>
                <TableCell>{t('columns.lastRun')}</TableCell>
                <TableCell>{t('columns.status')}</TableCell>
                <TableCell>{t('columns.duration')}</TableCell>
                <TableCell>{t('columns.records')}</TableCell>
                <TableCell>{t('columns.overdue')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {health.jobStatuses?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography sx={{ opacity: 0.8, py: 1 }}>{t('messages.noJobData')}</Typography>
                  </TableCell>
                </TableRow>
              )}
              {health.jobStatuses?.map((job: JobStatusDto) => (
                <TableRow key={job.jobName}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{job.jobName}</TableCell>
                  <TableCell>{job.lastStartedAt ? new Date(job.lastStartedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={job.lastStatus}
                      size="small"
                      color={
                        job.lastStatus === 'success'
                          ? 'success'
                          : job.lastStatus === 'running'
                            ? 'info'
                            : job.lastStatus === 'stuck'
                              ? 'error'
                              : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell>{formatDuration(job.lastDurationMs)}</TableCell>
                  <TableCell>{formatNumber(job.lastRecordsProcessed)}</TableCell>
                  <TableCell>
                    {job.isOverdue && <Chip label={t('labels.overdue')} size="small" color="warning" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataTablePaper>

      {/* Timing Margins */}
      {health.timingMargins && health.timingMargins.length > 0 && (
        <DataTablePaper sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            {t('sections.timingMargins')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>{t('columns.fetchJob')}</TableCell>
                  <TableCell>{t('columns.aggregateJob')}</TableCell>
                  <TableCell>{t('columns.avgMargin')}</TableCell>
                  <TableCell>{t('columns.minMargin')}</TableCell>
                  <TableCell>{t('columns.overlaps')}</TableCell>
                  <TableCell>{t('columns.samples')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {health.timingMargins.map((pair: TimingMarginPairDto, idx: number) => (
                  <TimingMarginRow key={idx} pair={pair} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataTablePaper>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Data Freshness */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('sections.dataFreshness')}
            </Typography>
            {health.dataFreshness && (
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>{t('labels.dailyAccountStats')}</TableCell>
                    <TableCell>
                      {health.dataFreshness.dailyAccountStats?.latestDate
                        ? new Date(health.dataFreshness.dailyAccountStats.latestDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={health.dataFreshness.dailyAccountStats?.isStale ? t('labels.stale') : t('labels.fresh')}
                        size="small"
                        color={health.dataFreshness.dailyAccountStats?.isStale ? 'error' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('labels.dailyTootStats')}</TableCell>
                    <TableCell>
                      {health.dataFreshness.dailyTootStats?.latestDate
                        ? new Date(health.dataFreshness.dailyTootStats.latestDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={health.dataFreshness.dailyTootStats?.isStale ? t('labels.stale') : t('labels.fresh')}
                        size="small"
                        color={health.dataFreshness.dailyTootStats?.isStale ? 'error' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('labels.toots')}</TableCell>
                    <TableCell>
                      {health.dataFreshness.toots?.latestFetchedAt
                        ? new Date(health.dataFreshness.toots.latestFetchedAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={health.dataFreshness.toots?.isStale ? t('labels.stale') : t('labels.fresh')}
                        size="small"
                        color={health.dataFreshness.toots?.isStale ? 'error' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Collection Sizes */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('sections.collectionSizes')}
            </Typography>
            {health.collectionSizes && (
              <Table size="small">
                <TableBody>
                  {Object.entries(health.collectionSizes).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell>{t(`collections.${key}`, { defaultValue: key })}</TableCell>
                      <TableCell align="right">{formatNumber(value as number)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Failures */}
      {health.recentFailures && health.recentFailures.length > 0 && (
        <DataTablePaper>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            {t('sections.recentFailures')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('columns.jobName')}</TableCell>
                  <TableCell>{t('columns.time')}</TableCell>
                  <TableCell>{t('columns.error')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {health.recentFailures.map((failure: RecentFailureDto, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{failure.jobName}</TableCell>
                    <TableCell>{new Date(failure.startedAt).toLocaleString()}</TableCell>
                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {failure.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataTablePaper>
      )}
    </Container>
  );
}
