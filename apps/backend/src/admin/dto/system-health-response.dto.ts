import { ApiProperty } from '@nestjs/swagger';

export class JobStatusDto {
  @ApiProperty({ example: 'fetch:accountstats', description: 'Job name' })
  jobName: string;

  @ApiProperty({ example: '2026-02-18T03:33:00.000Z', description: 'When the job last started' })
  lastStartedAt: string;

  @ApiProperty({
    example: '2026-02-18T03:33:45.000Z',
    description: 'When the job last completed',
    nullable: true,
  })
  lastCompletedAt: string | null;

  @ApiProperty({ example: 'success', description: 'Last job status (running, success, failure, stuck)' })
  lastStatus: string;

  @ApiProperty({ example: 45000, description: 'Duration of last run in ms', nullable: true })
  lastDurationMs: number | null;

  @ApiProperty({ example: 10, description: 'Records processed in last run', nullable: true })
  lastRecordsProcessed: number | null;

  @ApiProperty({ example: null, description: 'Error message from last run', nullable: true })
  lastErrorMessage: string | null;

  @ApiProperty({ example: false, description: 'Whether the job is overdue (last run > 24h ago)' })
  isOverdue: boolean;
}

export class DataFreshnessItemDto {
  @ApiProperty({
    example: '2026-02-17T00:00:00.000Z',
    description: 'Latest date of data',
    nullable: true,
  })
  latestDate?: string | null;

  @ApiProperty({
    example: '2026-02-17T16:33:00.000Z',
    description: 'Latest fetchedAt timestamp',
    nullable: true,
  })
  latestFetchedAt?: string | null;

  @ApiProperty({ example: false, description: 'Whether the data is stale (> 2 days old)' })
  isStale: boolean;
}

export class DataFreshnessDto {
  @ApiProperty({ type: DataFreshnessItemDto, description: 'Daily account stats freshness' })
  dailyAccountStats: DataFreshnessItemDto;

  @ApiProperty({ type: DataFreshnessItemDto, description: 'Daily toot stats freshness' })
  dailyTootStats: DataFreshnessItemDto;

  @ApiProperty({ type: DataFreshnessItemDto, description: 'Toots freshness' })
  toots: DataFreshnessItemDto;
}

export class CollectionSizesDto {
  @ApiProperty({ example: 50, description: 'Number of user documents' })
  users: number;

  @ApiProperty({ example: 45, description: 'Number of account documents' })
  accounts: number;

  @ApiProperty({ example: 10000, description: 'Number of toot documents' })
  toots: number;

  @ApiProperty({ example: 5000, description: 'Number of daily account stats documents' })
  dailyAccountStats: number;

  @ApiProperty({ example: 8000, description: 'Number of daily toot stats documents' })
  dailyTootStats: number;

  @ApiProperty({ example: 100, description: 'Number of refresh token documents' })
  refreshTokens: number;

  @ApiProperty({ example: 5, description: 'Number of mastodon app documents' })
  mastodonApps: number;

  @ApiProperty({ example: 500, description: 'Number of CLI job run documents' })
  cliJobRuns: number;
}

export class TimingMarginDetailDto {
  @ApiProperty({ example: '2026-02-18T03:03:00.000Z', description: 'When the aggregate job started' })
  aggregateStartedAt: string;

  @ApiProperty({
    example: '2026-02-18T02:34:00.000Z',
    description: 'When the preceding fetch completed',
    nullable: true,
  })
  fetchCompletedAt: string | null;

  @ApiProperty({
    example: 1740000,
    description: 'Time margin in ms between fetch end and aggregate start',
    nullable: true,
  })
  marginMs: number | null;

  @ApiProperty({ example: false, description: 'Whether a fetch was still running when aggregate started' })
  hadOverlap: boolean;
}

export class TimingMarginSummaryDto {
  @ApiProperty({ example: 7, description: 'Number of samples in the analysis period' })
  sampleCount: number;

  @ApiProperty({ example: 0, description: 'Number of times fetch and aggregate overlapped' })
  overlapCount: number;

  @ApiProperty({ example: 1200000, description: 'Minimum margin in ms', nullable: true })
  minMarginMs: number | null;

  @ApiProperty({ example: 1800000, description: 'Maximum margin in ms', nullable: true })
  maxMarginMs: number | null;

  @ApiProperty({ example: 1500000, description: 'Average margin in ms', nullable: true })
  avgMarginMs: number | null;

  @ApiProperty({ type: [TimingMarginDetailDto], description: 'Per-run details' })
  details: TimingMarginDetailDto[];
}

export class TimingMarginPairDto {
  @ApiProperty({ example: 'fetch:accountstats', description: 'Fetch job name' })
  fetchJob: string;

  @ApiProperty({ example: 'aggregate:dailyaccountstats', description: 'Aggregate job name' })
  aggregateJob: string;

  @ApiProperty({ type: TimingMarginSummaryDto, description: 'Timing analysis for last 7 days' })
  last7Days: TimingMarginSummaryDto;
}

export class RecentFailureDto {
  @ApiProperty({ example: 'fetch:tootstats', description: 'Job name' })
  jobName: string;

  @ApiProperty({ example: '2026-02-18T03:33:00.000Z', description: 'When the job started' })
  startedAt: string;

  @ApiProperty({ example: 'Connection timeout', description: 'Error message', nullable: true })
  errorMessage: string | null;
}

export class SystemHealthResponseDto {
  @ApiProperty({
    example: '2026-02-18T03:17:00.000Z',
    description: 'When the health snapshot was generated',
    required: false,
  })
  generatedAt?: string;

  @ApiProperty({ type: [JobStatusDto], description: 'Status of each CLI job' })
  jobStatuses: JobStatusDto[];

  @ApiProperty({ type: DataFreshnessDto, description: 'Data freshness indicators' })
  dataFreshness: DataFreshnessDto;

  @ApiProperty({ type: CollectionSizesDto, description: 'Document counts per collection' })
  collectionSizes: CollectionSizesDto;

  @ApiProperty({ type: [TimingMarginPairDto], description: 'Timing margin analysis for fetch/aggregate pairs' })
  timingMargins: TimingMarginPairDto[];

  @ApiProperty({ type: [RecentFailureDto], description: 'Recent job failures (last 7 days)' })
  recentFailures: RecentFailureDto[];
}
