import { Flags } from '@oclif/core';
import axios from 'axios';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class OldAccounts extends BaseCommand {
  static args = {};
  static description = 'Send deletion reminder email to users who have not logged in for 90+ days';

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
    authorization: Flags.string({
      char: 't',
      description: 'Authorization header',
      default: process.env.EMAIL_API_KEY || 'no-key',
    }),
    user: Flags.string({
      char: 'u',
      description: 'Only process specific user',
    }),
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(OldAccounts);

    this.log('Send old accounts email to users started.');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'mail:oldaccounts', logger: this }, async () => {
        const usersQuery: Filter<Document> = {};

        if (flags.user) {
          this.log(`Send old accounts: Only process user ${flags.user}`);
          usersQuery['_id'] = new ObjectId(flags.user);
        } else {
          // Find users who haven't logged in for 90+ days
          usersQuery['lastLoginAt'] = {
            $lt: cutoffDate,
          };
          usersQuery['isActive'] = true;
          usersQuery['emailVerified'] = true;
          usersQuery['oldAccountDeletionNoticeSent'] = { $ne: true };
          usersQuery['role'] = 'account-owner';
        }

        const userList = await db.collection('users').find(usersQuery).project({ _id: 1 }).toArray();

        const userSet = new Set(userList.map(({ _id }) => `${_id}`));
        let processed = 0;

        for (const userID of userSet) {
          try {
            if (!flags.dryRun) {
              this.log(`Send old accounts: Trigger mail for user ${userID}`);
              await axios.post(
                `${flags.host}/mail/old-account`,
                { userID },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: flags.authorization,
                  },
                },
              );
            } else {
              this.log(`Send old accounts: Trigger mail for user ${userID} (DRY RUN)`);
            }
            processed++;
          } catch (error: any) {
            this.logError(`Send old accounts: Failed for user ${userID} with error ${error?.message}`);
          }
        }

        this.log('Send old accounts email to users done.');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
