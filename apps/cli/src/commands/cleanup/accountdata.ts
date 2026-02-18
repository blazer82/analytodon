import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';

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

    try {
      await trackJobRun({ db, jobName: 'cleanup:accountdata', logger: this }, async () => {
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

          let totalDeleted = 0;

          for (const collection of collections) {
            if (!flags.dryRun) {
              const { deletedCount } = await db.collection(collection).deleteMany(filter);
              totalDeleted += deletedCount;
              this.log(`Clean up account data: Removed ${deletedCount} ${collection}`);
            } else {
              const count = await db.collection(collection).count(filter);
              totalDeleted += count;
              this.log(`Clean up account data: Removed ${count} ${collection} (DRY RUN)`);
            }
          }

          this.log('Clean up account data: Done');
          return { recordsProcessed: totalDeleted };
        } else {
          this.logWarning('Clean up account data: Something went wrong, no changes made.');
          return { recordsProcessed: 0 };
        }
      });
    } finally {
      await connection.close();
    }
  }
}
