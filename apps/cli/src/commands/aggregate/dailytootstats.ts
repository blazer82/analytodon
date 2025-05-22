import { Command, Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { getTimezones } from '../../helpers/getTimezones';
import { logger } from '../../helpers/logger';
import { generateDailyTootstats } from '../../service/tootstats/generateDailyTootstats';

export default class DailyTootStats extends Command {
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
      default: 'analytodon',
    }),
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(DailyTootStats);

    logger.info('Daily toot stats: Aggregation started');

    const timezones = flags.timezone ? [flags.timezone] : getTimezones([0]); // run at 00:00

    logger.info(`Daily toot stats: Timezones: ${timezones.join(',')}`);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const accounts = await db
      .collection('accounts')
      .find({
        isActive: true,
        timezone: { $in: timezones },
      })
      .toArray();

    for (const account of accounts) {
      try {
        await generateDailyTootstats(db, account);
      } catch (error: any) {
        logger.error(`Daily toot stats: Failed for ${account.name}: ${error?.message}`);
      }
    }

    await connection.close();
  }
}
