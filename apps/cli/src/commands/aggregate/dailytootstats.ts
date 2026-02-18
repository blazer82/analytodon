import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { getTimezones } from '../../helpers/getTimezones';
import { trackJobRun } from '../../helpers/trackJobRun';
import { generateDailyTootstats } from '../../service/tootstats/generateDailyTootstats';

export default class DailyTootStats extends BaseCommand {
  static description = 'Aggregate daily toot stats for all accounts';

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
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(DailyTootStats);

    this.log('Daily toot stats: Aggregation started.');

    const timezones = flags.timezone ? [flags.timezone] : getTimezones([0]); // run at 00:00

    this.log(`Daily toot stats: Timezones: ${timezones.join(',')}`);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'aggregate:dailytootstats', logger: this }, async () => {
        const accounts = await db
          .collection('accounts')
          .find({
            isActive: true,
            timezone: { $in: timezones },
          })
          .toArray();

        let processed = 0;

        for (const account of accounts) {
          try {
            await generateDailyTootstats(db, account);
            processed++;
          } catch (error: any) {
            this.logError(`Daily toot stats: Failed for ${account.name}: ${error?.message}`);
          }
        }

        this.log('Daily toot stats: Aggregation done.');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
