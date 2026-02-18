import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class SystemHealth extends BaseCommand {
  static description = 'Aggregate system health snapshot (job statuses, timing margins, data freshness)';

  static examples = [`<%= config.bin %> <%= command.id %>`];

  static flags = {
    connectionString: Flags.string({
      char: 'c',
      description: 'MongoDB connection string',
      default: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    }),
    database: Flags.string({
      char: 'd',
      description: 'Source database name',
      default: process.env.MONGODB_DATABASE || 'analytodon',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(SystemHealth);

    this.log('System health: Aggregation started.');

    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'aggregate:systemhealth', logger: this }, async () => {
        const now = new Date();
        const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

        const jobRunsCol = db.collection('cli_job_runs');

        // 1. Job statuses: latest run per job
        const latestJobRuns = await jobRunsCol
          .aggregate<{
            _id: string;
            lastStartedAt: Date;
            lastCompletedAt: Date | null;
            lastStatus: string;
            lastDurationMs: number | null;
            lastRecordsProcessed: number | null;
            lastErrorMessage: string | null;
          }>([
            { $sort: { startedAt: -1 } },
            {
              $group: {
                _id: '$jobName',
                lastStartedAt: { $first: '$startedAt' },
                lastCompletedAt: { $first: '$completedAt' },
                lastStatus: { $first: '$status' },
                lastDurationMs: { $first: '$durationMs' },
                lastRecordsProcessed: { $first: '$recordsProcessed' },
                lastErrorMessage: { $first: '$errorMessage' },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray();

        const jobStatuses = latestJobRuns.map((job) => {
          const isOverdue = job.lastStartedAt < daysAgo(1);
          const isStuck = job.lastStatus === 'running' && job.lastStartedAt < hoursAgo(2);
          return {
            jobName: job._id,
            lastStartedAt: job.lastStartedAt.toISOString(),
            lastCompletedAt: job.lastCompletedAt?.toISOString() ?? null,
            lastStatus: isStuck ? 'stuck' : job.lastStatus,
            lastDurationMs: job.lastDurationMs,
            lastRecordsProcessed: job.lastRecordsProcessed,
            lastErrorMessage: job.lastErrorMessage,
            isOverdue,
          };
        });

        // 2. Data freshness
        const [latestDailyAccountStats, latestDailyTootStats, latestToot] = await Promise.all([
          db
            .collection('dailyaccountstats')
            .find({}, { sort: { day: -1 }, limit: 1, projection: { day: 1 } })
            .toArray(),
          db
            .collection('dailytootstats')
            .find({}, { sort: { day: -1 }, limit: 1, projection: { day: 1 } })
            .toArray(),
          db
            .collection('toots')
            .find({}, { sort: { fetchedAt: -1 }, limit: 1, projection: { fetchedAt: 1 } })
            .toArray(),
        ]);

        const staleThreshold = daysAgo(2);

        const dataFreshness = {
          dailyAccountStats: {
            latestDate: latestDailyAccountStats[0]?.day?.toISOString() ?? null,
            isStale: !latestDailyAccountStats[0]?.day || latestDailyAccountStats[0].day < staleThreshold,
          },
          dailyTootStats: {
            latestDate: latestDailyTootStats[0]?.day?.toISOString() ?? null,
            isStale: !latestDailyTootStats[0]?.day || latestDailyTootStats[0].day < staleThreshold,
          },
          toots: {
            latestFetchedAt: latestToot[0]?.fetchedAt?.toISOString() ?? null,
            isStale: !latestToot[0]?.fetchedAt || latestToot[0].fetchedAt < staleThreshold,
          },
        };

        // 3. Collection sizes
        const [
          usersCount,
          accountsCount,
          tootsCount,
          dailyAccountStatsCount,
          dailyTootStatsCount,
          refreshTokensCount,
          mastodonAppsCount,
          cliJobRunsCount,
        ] = await Promise.all([
          db.collection('users').estimatedDocumentCount(),
          db.collection('accounts').estimatedDocumentCount(),
          db.collection('toots').estimatedDocumentCount(),
          db.collection('dailyaccountstats').estimatedDocumentCount(),
          db.collection('dailytootstats').estimatedDocumentCount(),
          db.collection('refreshtokens').estimatedDocumentCount(),
          db.collection('mastodonapps').estimatedDocumentCount(),
          db.collection('cli_job_runs').estimatedDocumentCount(),
        ]);

        const collectionSizes = {
          users: usersCount,
          accounts: accountsCount,
          toots: tootsCount,
          dailyAccountStats: dailyAccountStatsCount,
          dailyTootStats: dailyTootStatsCount,
          refreshTokens: refreshTokensCount,
          mastodonApps: mastodonAppsCount,
          cliJobRuns: cliJobRunsCount,
        };

        // 4. Timing margins for fetch/aggregate pairs
        const timingPairs = [
          { fetchJob: 'fetch:accountstats', aggregateJob: 'aggregate:dailyaccountstats' },
          { fetchJob: 'fetch:tootstats', aggregateJob: 'aggregate:dailytootstats' },
        ];

        const timingMargins = [];

        for (const pair of timingPairs) {
          const sevenDaysAgo = daysAgo(7);

          const [fetchRuns, aggregateRuns] = await Promise.all([
            jobRunsCol
              .find({
                jobName: pair.fetchJob,
                status: 'success',
                startedAt: { $gte: sevenDaysAgo },
              })
              .sort({ completedAt: -1 })
              .toArray(),
            jobRunsCol
              .find({
                jobName: pair.aggregateJob,
                status: 'success',
                startedAt: { $gte: sevenDaysAgo },
              })
              .sort({ startedAt: -1 })
              .toArray(),
          ]);

          const details: {
            aggregateStartedAt: string;
            fetchCompletedAt: string | null;
            marginMs: number | null;
            hadOverlap: boolean;
          }[] = [];

          for (const aggRun of aggregateRuns) {
            // Find the most recent fetch run that completed before the aggregate started
            const precedingFetch = fetchRuns.find((f) => f.completedAt && f.completedAt <= aggRun.startedAt);

            // Check if any fetch was still running when this aggregate started
            const overlappingFetch = fetchRuns.find(
              (f) => f.startedAt <= aggRun.startedAt && (!f.completedAt || f.completedAt > aggRun.startedAt),
            );

            if (precedingFetch?.completedAt) {
              const marginMs = aggRun.startedAt.getTime() - precedingFetch.completedAt.getTime();
              details.push({
                aggregateStartedAt: aggRun.startedAt.toISOString(),
                fetchCompletedAt: precedingFetch.completedAt.toISOString(),
                marginMs,
                hadOverlap: !!overlappingFetch,
              });
            } else {
              details.push({
                aggregateStartedAt: aggRun.startedAt.toISOString(),
                fetchCompletedAt: null,
                marginMs: null,
                hadOverlap: !!overlappingFetch,
              });
            }
          }

          const marginsWithValues = details.filter((d) => d.marginMs !== null).map((d) => d.marginMs!);
          const overlapCount = details.filter((d) => d.hadOverlap).length;

          timingMargins.push({
            fetchJob: pair.fetchJob,
            aggregateJob: pair.aggregateJob,
            last7Days: {
              sampleCount: details.length,
              overlapCount,
              minMarginMs: marginsWithValues.length > 0 ? Math.min(...marginsWithValues) : null,
              maxMarginMs: marginsWithValues.length > 0 ? Math.max(...marginsWithValues) : null,
              avgMarginMs:
                marginsWithValues.length > 0
                  ? Math.round(marginsWithValues.reduce((a, b) => a + b, 0) / marginsWithValues.length)
                  : null,
              details,
            },
          });
        }

        // 5. Recent failures
        const recentFailuresRaw = await jobRunsCol
          .find(
            {
              status: 'failure',
              startedAt: { $gte: daysAgo(7) },
            },
            { sort: { startedAt: -1 }, limit: 20 },
          )
          .toArray();

        const recentFailures = recentFailuresRaw.map((f) => ({
          jobName: f.jobName,
          startedAt: (f.startedAt as Date).toISOString(),
          errorMessage: f.errorMessage ?? null,
        }));

        // Save snapshot
        const data = {
          jobStatuses,
          dataFreshness,
          collectionSizes,
          timingMargins,
          recentFailures,
        };

        await db.collection('systemhealth').insertOne({
          generatedAt: now,
          data,
          createdAt: now,
          updatedAt: now,
        });

        this.log('System health: Snapshot saved successfully.');
        this.log('System health: Aggregation done.');
      });
    } finally {
      await connection.close();
    }
  }
}
