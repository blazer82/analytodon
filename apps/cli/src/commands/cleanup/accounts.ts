import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { processInBatches } from '../../helpers/processInBatches';

const BATCH_SIZE = 5;

export default class Accounts extends BaseCommand {
  static description = 'Clean up accounts.';

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
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(Accounts);

    this.log('Clean up accounts: Started');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const userIds = (
      await db
        .collection('users')
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map(({ _id }) => _id);

    const accountIds = (
      await db
        .collection('accounts')
        .find(
          {
            $or: [{ owner: { $nin: userIds } }, { setupComplete: { $ne: true }, createdAt: { $lt: cutoffDate } }],
          },
          { projection: { _id: 1 } },
        )
        .toArray()
    ).map(({ _id }) => _id);

    this.log(`Clean up accounts: ${accountIds.length} accounts to clean up.`);

    await processInBatches(BATCH_SIZE, accountIds, async (id) => {
      this.log(`Clean up accounts: Remove account ${id}${flags.dryRun ? ' (DRY RUN)' : ''}`);
      if (!flags.dryRun) {
        await db.collection('accounts').deleteOne({ _id: id });
        await db.collection('accountcredentials').deleteOne({ account: id });
      }
    });

    this.log(`Clean up accounts: Update affected users${flags.dryRun ? ' (DRY RUN)' : ''}`);
    if (!flags.dryRun) {
      await db.collection('users').updateMany({}, { $pull: { accounts: { $in: accountIds } } as any });
    }

    this.log('Clean up accounts: Done');

    await connection.close();
  }
}
