import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { fetchTootstatsForAccount } from '../../helpers/fetchTootstatsForAccount';
import { getTimezones } from '../../helpers/getTimezones';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class TootStats extends BaseCommand {
  static description = 'Gather toot stats for all accounts';

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
    all: Flags.boolean({
      char: 'a',
      description: 'Fetch all (legacy, always on)',
      default: true,
    }),
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
    account: Flags.string({
      char: 'm',
      description: 'Only process this account (disables timezone filter!)',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(TootStats);

    this.log('Fetching toot stats: Started');

    const timezones = flags.timezone ? [flags.timezone] : getTimezones([16, 20, 23]); // run at 16:00, 20:00, and 23:00

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'fetch:tootstats', logger: this }, async () => {
        const accountFilter: Filter<Document> = {
          isActive: true,
        };

        if (flags.account) {
          this.log(`Fetching toot stats: Account: ${flags.account}`);
          accountFilter['_id'] = new ObjectId(flags.account);
        } else {
          this.log(`Fetching toot stats: Timezones: ${timezones.join(',')}`);
          accountFilter['timezone'] = { $in: timezones };
        }

        const accounts = await db.collection('accounts').find(accountFilter).toArray();

        this.log(`Fetching toot stats: Found ${accounts.length} accounts to process`);

        let processed = 0;

        for (const account of accounts) {
          try {
            await fetchTootstatsForAccount(db, account);
            processed++;
          } catch (error: any) {
            this.logError(
              `Fetching toot stats: Failed to process account ${account.name} (${account._id}): ${error?.message || error}`,
            );
          }
        }

        this.log('Fetching toot stats: Done');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
