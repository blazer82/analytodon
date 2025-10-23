import { Flags } from '@oclif/core';
import generator from 'megalodon';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { decryptText } from '../../helpers/encryption';
import { getTimezones } from '../../helpers/getTimezones';

export default class AccountStats extends BaseCommand {
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
      default: process.env.MONGODB_DATABASE || 'analytodon',
    }),
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(AccountStats);

    this.log('Fetching account stats: Started');

    const timezones = flags.timezone ? [flags.timezone] : getTimezones([16, 20, 23]); // run at 16:00, 20:00, and 23:00

    this.log(`Fetching account stats: Timezones: ${timezones.join(',')}`);

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
      this.log(`Fetching account stats: Processing account ${account.name}`);

      try {
        const credentials = await db.collection('accountcredentials').findOne({ account: account._id });

        if (!credentials?.accessToken) {
          this.logWarning(`Fetching account stats: Access token not found for ${account.name}`);
          continue;
        }

        const decryptedAccessToken = decryptText(credentials.accessToken);
        if (!decryptedAccessToken) {
          this.logWarning(`Fetching account stats: Failed to decrypt access token for ${account.name}. Skipping.`);
          continue;
        }
        const mastodon = generator('mastodon', account.serverURL, decryptedAccessToken);

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

        this.log(`Fetching account stats: Done for ${account.name}`);
      } catch (error: any) {
        this.logError(`Fetching account stats: Error while processing ${account.name}: ${error?.message}`);
      }
    }

    this.log('Fetching account stats: Done');

    await connection.close();
  }
}
