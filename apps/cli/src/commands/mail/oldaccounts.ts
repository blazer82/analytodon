import { Flags } from '@oclif/core';
import axios from 'axios';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';

export default class OldAccounts extends BaseCommand {
  static args = {};
  static description = 'Send deletion reminder email to users with old accounts';

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
      default: process.env.APP_URL || 'https://app.analytodon.com',
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
    this.log('Send old accounts email to users started.');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    try {
      const { flags } = await this.parse(OldAccounts);

      // Connect to database
      const connection = await new MongoClient(flags.connectionString).connect();
      const db = connection.db(flags.database);

      const usersQuery: Filter<Document> = {};

      if (flags.user) {
        this.log(`Send old accounts: Only process user ${flags.user}`);
        usersQuery['_id'] = new ObjectId(flags.user);
      } else {
        const credentialsQuery: Filter<Document> = {
          updatedAt: {
            $lt: cutoffDate,
          },
        };

        const credentialList = await db
          .collection('usercredentials')
          .find(credentialsQuery)
          .project({ user: 1 })
          .toArray();
        const credentialSet = new Set(credentialList.map(({ user }) => user));

        usersQuery['_id'] = {
          $in: Array.from(credentialSet),
        };
        usersQuery['isActive'] = true;
        usersQuery['emailVerified'] = true;
        usersQuery['oldAccountDeletionNoticeSent'] = { $ne: true };
        usersQuery['role'] = 'account-owner';
      }

      const userList = await db.collection('users').find(usersQuery).project({ _id: 1 }).toArray();

      const userSet = new Set(userList.map(({ _id }) => `${_id}`));

      for (const userID of userSet) {
        try {
          if (!flags.dryRun) {
            this.log(`Send old accounts: Trigger mail for user ${userID}`);
            await axios.post(
              `${flags.host}/api/mail/oldaccount`,
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
        } catch (error: any) {
          this.error(`Send old accounts: Failed for user ${userID} with error ${error?.message}`);
        }
      }

      await connection.close();
    } catch (error: any) {
      this.error(`Send old accounts: Failed with error ${error?.message}`);
    }

    this.log('Send old accounts email to users done.');
  }
}
