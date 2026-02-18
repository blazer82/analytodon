import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class JobRuns extends BaseCommand {
  static description = 'Clean up old job runs and health snapshots.';

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
    days: Flags.integer({
      description: 'Delete records older than this many days',
      default: 30,
    }),
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(JobRuns);

    this.log('Clean up job runs and snapshots: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'cleanup:jobruns', logger: this }, async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - flags.days);

        let totalCount = 0;

        // Clean up cli_job_runs
        totalCount += await this.cleanupCollection(
          db,
          'cli_job_runs',
          { startedAt: { $lt: cutoffDate } },
          flags.dryRun,
        );

        // Clean up health snapshots
        const snapshotFilter: Filter<Document> = { generatedAt: { $lt: cutoffDate } };
        totalCount += await this.cleanupCollection(db, 'systemhealth', snapshotFilter, flags.dryRun);
        totalCount += await this.cleanupCollection(db, 'adminstats', snapshotFilter, flags.dryRun);
        totalCount += await this.cleanupCollection(db, 'accounthealth', snapshotFilter, flags.dryRun);

        this.log(`Clean up job runs and snapshots: Done (total: ${totalCount})`);
        return { recordsProcessed: totalCount };
      });
    } finally {
      await connection.close();
    }
  }

  private async cleanupCollection(
    db: ReturnType<MongoClient['db']>,
    collectionName: string,
    query: Filter<Document>,
    dryRun: boolean,
  ): Promise<number> {
    const collection = db.collection(collectionName);

    if (dryRun) {
      const count = await collection.countDocuments(query);
      this.log(`  ${collectionName}: ${count} records would be removed (DRY RUN)`);
      return count;
    }

    const { deletedCount } = await collection.deleteMany(query);
    this.log(`  ${collectionName}: Removed ${deletedCount} records`);
    return deletedCount;
  }
}
