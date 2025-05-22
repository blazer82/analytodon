import { Command, Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { getDaysAgo } from '../../helpers/getDaysAgo';
import { logger } from '../../helpers/logger';
import { processInBatches } from '../../helpers/processInBatches';

const BATCH_SIZE = 5;

export default class Tootstats extends Command {
  static description = 'Clean up old tootstats.';

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
    days: Flags.integer({
      char: 'r',
      description: 'Retain tootstats for this number of days back',
      default: 30,
    }),
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(Tootstats);

    logger.info('Clean up tootstats: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const cutoffDate = getDaysAgo(flags.days, 'Europe/London');

    const tootstats = await db
      .collection('tootstats')
      .aggregate([
        {
          $match: {
            fetchedAt: {
              $lt: cutoffDate,
            },
          },
        },
        {
          $group: {
            _id: {
              uri: '$uri',
              repliesCount: '$repliesCount',
              reblogsCount: '$reblogsCount',
              favouritesCount: '$favouritesCount',
            },
            fetchedAt: {
              $min: '$fetchedAt',
            },
          },
        },
        {
          $group: {
            _id: {
              uri: '$_id.uri',
            },
            fetchedAt: {
              $addToSet: '$fetchedAt',
            },
          },
        },
      ])
      .toArray();

    logger.info(`Clean up tootstats: ${tootstats.length} toots to clean up.`);

    await processInBatches(BATCH_SIZE, tootstats, async (info) => {
      logger.info(`Clean up tootstats: Clean up for toot ${info._id.uri}${flags.dryRun ? ' (DRY RUN)' : ''}`);

      const cleanupFilter: Filter<Document> = {
        uri: info._id.uri,
        fetchedAt: {
          $lt: cutoffDate,
          $nin: info.fetchedAt,
        },
      };

      const count = await db.collection('tootstats').countDocuments(cleanupFilter);

      logger.info(
        `Clean up tootstats: Remove ${count} instances of ${info._id.uri}${flags.dryRun ? ' (DRY RUN)' : ''}`,
      );

      if (!flags.dryRun) {
        await db.collection('tootstats').deleteMany(cleanupFilter);
      }
    });

    await connection.close();
  }
}
