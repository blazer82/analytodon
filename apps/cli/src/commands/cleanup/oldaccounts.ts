import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class OldAccounts extends BaseCommand {
  static args = {};
  static description = 'Delete users who have not logged in for 120+ days and were already notified';

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
    host: Flags.string({
      char: 'h',
      description: 'App host URL',
      default: process.env.APP_URL || 'http://localhost:3000',
    }),
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(OldAccounts);

    this.log('Cleanup old accounts started.');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 120);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'cleanup:oldaccounts', logger: this }, async () => {
        // Find users who haven't logged in for 120+ days AND were already sent deletion notice
        const usersQuery: Filter<Document> = {
          lastLoginAt: {
            $lt: cutoffDate,
          },
          oldAccountDeletionNoticeSent: true,
        };

        const userList = await db.collection('users').find(usersQuery).project({ _id: 1 }).toArray();

        const userSet = new Set(userList.map(({ _id }) => _id));
        let processed = 0;

        for (const userID of userSet) {
          try {
            if (!flags.dryRun) {
              this.log(`Cleanup old accounts: Delete user ${userID}`);
              await db.collection('users').deleteOne({ _id: userID });
            } else {
              this.log(`Cleanup old accounts: Delete user ${userID} (DRY RUN)`);
            }
            processed++;
          } catch (error: any) {
            this.logError(`Cleanup old accounts: Failed for user ${userID} with error ${error?.message}`);
          }
        }

        this.log('Cleanup old accounts done.');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
