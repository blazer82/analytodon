import { Command, Flags } from '@oclif/core';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { logger } from '../../helpers/logger';
import { generateDailyTootstats } from '../../service/tootstats/generateDailyTootstats';

export default class RebuildDailyTootStats extends Command {
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
    account: Flags.string({
      char: 'm',
      description: 'Rebuild daily toot stats for this account',
    }),
    entry: Flags.string({
      char: 'e',
      description: 'Rebuild a specific entry only',
    }),
    all: Flags.boolean({
      char: 'a',
      description: 'Rebuild daily toot stats for all accounts',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(RebuildDailyTootStats);

    if (!flags.account && !flags.all) {
      logger.warn('Rebuild daily toot stats: Either flag -a or -m must be set');
      return;
    }

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const accountFilter: Filter<Document> = {
      isActive: true,
    };

    if (flags.account) {
      logger.info(`Rebuild daily toot stats for account ${flags.account}`);
      accountFilter['_id'] = new ObjectId(flags.account);
    } else {
      logger.info('Rebuild daily toot stats for all accounts');
    }

    const accounts = await db.collection('accounts').find(accountFilter).toArray();

    for (const account of accounts) {
      logger.info(`Rebuild daily toot stats for account ${account.name}`);

      const entriesFilter: Filter<Document> = {
        account: account._id,
      };

      if (flags.entry) {
        logger.info(`Rebuild daily toot stats for entry ${flags.entry} only`);
        entriesFilter['_id'] = new ObjectId(flags.entry);
      }

      const currentTootstats = await db.collection('dailytootstats').find(entriesFilter).toArray();

      for (const currentEntry of currentTootstats) {
        try {
          const yesterday = currentEntry.day as Date;
          const today = new Date(yesterday);
          today.setUTCHours(yesterday.getUTCHours() + 24);
          await generateDailyTootstats(db, account, {
            today,
            yesterday,
            upsert: true,
          });
        } catch (error: any) {
          logger.error(`Daily toot stats: Failed for ${account.name}: ${error?.message}`);
        }
      }
    }

    await connection.close();
  }
}
