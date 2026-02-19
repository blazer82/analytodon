import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { getTimezones } from '../../helpers/getTimezones';
import { trackJobRun } from '../../helpers/trackJobRun';
import { generateHashtagStats } from '../../service/hashtagstats/generateHashtagStats';

export default class HashtagStats extends BaseCommand {
  static description = 'Aggregate hashtag stats for all accounts';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --full',
    '<%= config.bin %> <%= command.id %> --since 2024-01-01',
  ];

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
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
    full: Flags.boolean({
      description: 'Process all data (no date filter)',
      default: false,
    }),
    since: Flags.string({
      description: 'Process data since this date (ISO format, e.g., 2024-01-01)',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(HashtagStats);

    this.log('Hashtag stats: Aggregation started.');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      // Create compound index (idempotent)
      await db.collection('hashtagstats').createIndex({ account: 1, hashtag: 1, day: -1 }, { unique: true });

      await trackJobRun({ db, jobName: 'aggregate:hashtagstats', logger: this }, async () => {
        let accounts;

        if (flags.full) {
          // In full mode, process all active accounts
          this.log('Hashtag stats: Full mode - processing all active accounts.');
          accounts = await db.collection('accounts').find({ isActive: true }).toArray();
        } else {
          const timezones = flags.timezone ? [flags.timezone] : getTimezones([0]);
          this.log(`Hashtag stats: Timezones: ${timezones.join(',')}`);
          accounts = await db
            .collection('accounts')
            .find({
              isActive: true,
              timezone: { $in: timezones },
            })
            .toArray();
        }

        const options = {
          full: flags.full,
          since: flags.since ? new Date(flags.since) : undefined,
        };

        let processed = 0;

        for (const account of accounts) {
          try {
            await generateHashtagStats(db, account, options);
            processed++;
          } catch (error: any) {
            this.logError(`Hashtag stats: Failed for ${account.name}: ${error?.message}`);
          }
        }

        this.log('Hashtag stats: Aggregation done.');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
