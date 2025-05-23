import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';

export default class Accountdata extends BaseCommand {
  static description = 'Clean up orphaned account data.';

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
    const { flags } = await this.parse(Accountdata);

    this.log('Clean up account data: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    const accountIds = (
      await db
        .collection('accounts')
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map(({ _id }) => _id);

    if (accountIds.length > 0) {
      const filter: Filter<Document> = {
        account: { $nin: accountIds },
      };

      const collections = [
        'accountcredentials',
        'accountstats',
        'dailyaccountstats',
        'dailytootstats',
        'toots',
        'tootstats',
      ];

      for (const collection of collections) {
        if (!flags.dryRun) {
          const { deletedCount } = await db.collection(collection).deleteMany(filter);
          this.log(`Clean up account data: Removed ${deletedCount} ${collection}`);
        } else {
          const count = await db.collection(collection).count(filter);
          this.log(`Clean up account data: Removed ${count} ${collection} (DRY RUN)`);
        }
      }

      this.log('Clean up account data: Done');
    } else {
      this.warn('Clean up account data: Something went wrong, no changes made.');
    }

    await connection.close();
  }
}
