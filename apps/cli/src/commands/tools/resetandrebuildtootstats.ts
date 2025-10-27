import { Flags } from '@oclif/core';
import { MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';

export default class ResetAndRebuildTootStats extends BaseCommand {
  static description = 'Rebuild toot stats for a specific account by clearing existing data and re-fetching';

  static examples = [
    `<%= config.bin %> <%= command.id %> -a 507f1f77bcf86cd799439011`,
    `<%= config.bin %> <%= command.id %> --account 507f1f77bcf86cd799439011 -c mongodb://localhost:27017`,
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
    account: Flags.string({
      char: 'a',
      description: 'Account ID to rebuild stats for',
      required: true,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(ResetAndRebuildTootStats);

    this.log(`Rebuild toot stats: Started for account ${flags.account}`);

    // Validate account ID format
    if (!ObjectId.isValid(flags.account)) {
      this.logError(`Rebuild toot stats: Invalid account ID format: ${flags.account}`);
      return;
    }

    const accountId = new ObjectId(flags.account);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      // Check if account exists
      const account = await db.collection('accounts').findOne({ _id: accountId });
      if (!account) {
        this.logError(`Rebuild toot stats: Account ${flags.account} not found`);
        await connection.close();
        return;
      }

      this.log(`Rebuild toot stats: Found account ${account.name} (${account._id})`);

      // Reset tootHistoryComplete flag
      this.log(`Rebuild toot stats: Resetting tootHistoryComplete flag`);
      await db.collection('accounts').updateOne({ _id: accountId }, { $set: { tootHistoryComplete: false } });

      // Delete all toot-related data for this account
      this.log(`Rebuild toot stats: Deleting existing toots`);
      const tootsDeleted = await db.collection('toots').deleteMany({ account: accountId });
      this.log(`Rebuild toot stats: Deleted ${tootsDeleted.deletedCount} toots`);

      this.log(`Rebuild toot stats: Deleting existing tootstats`);
      const tootStatsDeleted = await db.collection('tootstats').deleteMany({ account: accountId });
      this.log(`Rebuild toot stats: Deleted ${tootStatsDeleted.deletedCount} tootstats`);

      this.log(`Rebuild toot stats: Deleting existing dailytootstats`);
      const dailyTootStatsDeleted = await db.collection('dailytootstats').deleteMany({ account: accountId });
      this.log(`Rebuild toot stats: Deleted ${dailyTootStatsDeleted.deletedCount} dailytootstats`);

      // Close connection before calling other command
      await connection.close();

      // Call fetch:initialstats command with appropriate flags
      this.log(`Rebuild toot stats: Calling fetch:initialstats to re-fetch data`);
      await this.config.runCommand('fetch:initialstats', [
        '-s', // skip email
        '--no-accountStats', // only fetch toot stats
        '-a',
        flags.account,
        '-c',
        flags.connectionString,
        '-d',
        flags.database,
      ]);

      this.log(`Rebuild toot stats: Completed for account ${flags.account}`);
    } catch (error) {
      this.logError(`Rebuild toot stats: Error: ${error}`);
      await connection.close();
      throw error;
    }
  }
}
