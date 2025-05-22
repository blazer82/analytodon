import { Command, Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { logger } from '../../helpers/logger';
import { processInBatches } from '../../helpers/processInBatches';

const BATCH_SIZE = 5;

export default class Users extends Command {
  static description = "Clean up users that haven't completed setup.";

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
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(Users);

    logger.info('Clean up users: Started');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const usersQuery: Filter<Document> = {
      role: 'account-owner',
      'accounts.0': { $exists: false },
      createdAt: { $lt: cutoffDate },
    };

    const userList = await db
      .collection('users')
      .find(usersQuery, { projection: { _id: 1 } })
      .toArray();

    logger.info(`Clean up users: ${userList.length} users to clean up.`);

    await processInBatches(BATCH_SIZE, userList, async (user) => {
      logger.info(`Clean up users: Remove user ${user._id}${flags.dryRun ? ' (DRY RUN)' : ''}`);
      if (!flags.dryRun) {
        await db.collection('users').deleteOne({ _id: user._id });
        await db.collection('usercredentials').deleteOne({ user: user._id });
      }
    });

    logger.info('Clean up users: Done');

    await connection.close();
  }
}
