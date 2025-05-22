import { Command, Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { logger } from '../../helpers/logger';
import { processInBatches } from '../../helpers/processInBatches';

const BATCH_SIZE = 5;

export default class Usercredentials extends Command {
  static description = 'Clean up user credentials.';

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
    const { flags } = await this.parse(Usercredentials);

    logger.info('Clean up user credentials: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const userIds = (
      await db
        .collection('users')
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map(({ _id }) => _id);

    const credentials = await db
      .collection('usercredentials')
      .find(
        {
          user: { $nin: userIds },
        },
        { projection: { _id: 1 } },
      )
      .toArray();

    logger.info(`Clean up user credentials: ${credentials.length} credentials to clean up.`);

    await processInBatches(BATCH_SIZE, credentials, async (doc) => {
      logger.info(`Clean up user credentials: Remove credentials ${doc._id}${flags.dryRun ? ' (DRY RUN)' : ''}`);
      if (!flags.dryRun) {
        await db.collection('usercredentials').deleteOne({ _id: doc._id });
      }
    });

    logger.info('Clean up user credentials: Done');

    await connection.close();
  }
}
