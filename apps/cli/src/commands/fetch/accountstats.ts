import { Command, Flags } from '@oclif/core';
import generator from 'megalodon';
import { MongoClient } from 'mongodb';

import { getTimezones } from '../../helpers/getTimezones';
import { logger } from '../../helpers/logger';

export default class AccountStats extends Command {
  static description = 'Gather account stats for all accounts';

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
    const { flags } = await this.parse(AccountStats);

    logger.info('Fetching account stats: Started');

    const timezones = flags.timezone ? [flags.timezone] : getTimezones([16, 20, 23]); // run at 16:00, 20:00, and 23:00

    logger.info(`Fetching account stats: Timezones: ${timezones.join(',')}`);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const accounts = await db
      .collection('accounts')
      .find({
        isActive: true,
        credentials: { $exists: true },
        timezone: { $in: timezones },
      })
      .toArray();

    for (const account of accounts) {
      logger.info(`Fetching account stats: Processing account ${account.name}`);

      const credentials = await db.collection('accountcredentials').findOne({ account: account._id });

      if (!credentials?.accessToken) {
        logger.info(`Fetching account stats: Access token not found for ${account.name}`);
      } else {
        try {
          const mastodon = generator('mastodon', account.serverURL, credentials.accessToken);

          const userInfo = await mastodon.verifyAccountCredentials();

          const accountStats = {
            followersCount: userInfo.data.followers_count ?? 0,
            followingCount: userInfo.data.following_count ?? 0,
            statusesCount: userInfo.data.statuses_count ?? 0,
          };

          await db.collection('accountstats').insertOne({
            account: account._id,
            ...accountStats,
            fetchedAt: new Date(),
          });

          logger.info(`Fetching account stats: Done for ${account.name}`);
        } catch (error: any) {
          logger.error(`Fetching account stats: Error while processing ${account.name}: ${error?.message}`);
        }
      }
    }

    await connection.close();
  }
}
