import { Flags } from '@oclif/core';
import axios from 'axios';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { createInitialAccountStats } from '../../helpers/createInitialAccountStats';
import { createInitialTootStats } from '../../helpers/createInitialTootStats';
import { fetchTootstatsForAccount } from '../../helpers/fetchTootstatsForAccount';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class InitialStats extends BaseCommand {
  static description = 'Gather initial stats for all accounts (only 1 per call)';

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
    account: Flags.string({
      char: 'a',
      description: 'Only process specific account (ignores initialStatsFetched flag)',
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
    skipEmail: Flags.boolean({
      char: 's',
      description: 'Skip sending email notification',
      default: false,
    }),
    accountStats: Flags.boolean({
      description: 'Fetch account stats (followers)',
      default: true,
      allowNo: true,
    }),
    tootStats: Flags.boolean({
      description: 'Fetch toot stats (replies, boosts, favorites)',
      default: true,
      allowNo: true,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(InitialStats);

    this.log('Fetching initial stats: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'fetch:initialstats', logger: this }, async () => {
        const accountQuery: Filter<Document> = {
          isActive: true,
          requestedScope: { $all: ['read:accounts', 'read:statuses', 'read:notifications'] },
        };

        if (flags.account) {
          this.log(`Fetching initial stats: Only process account ${flags.account}`);
          accountQuery['_id'] = new ObjectId(flags.account);
        } else {
          // Only check initialStatsFetched when no specific account is provided
          accountQuery['initialStatsFetched'] = { $ne: true };
        }

        const account = await db.collection('accounts').findOne(accountQuery);

        if (account) {
          this.log(`Fetching initial stats: Processing account ${account.name} (ID: ${account._id})`);

          // Check if credentials exist for this account
          const credentials = await db.collection('accountcredentials').findOne({ account: account._id });
          if (!credentials) {
            this.logWarning(
              `Fetching initial stats: No credentials found for account ${account.name} (ID: ${account._id}). Skipping.`,
            );
            return { recordsProcessed: 0 };
          }

          if (!account.owner) {
            this.logWarning(
              `Fetching initial stats: Account ${account._id} (${account.name}) does not have an owner field. Skipping.`,
            );
            return { recordsProcessed: 0 };
          }
          const user = await db.collection('users').findOne({ _id: account.owner as ObjectId });

          if (user) {
            this.log(`Fetching initial stats: Found owner ${user._id} for account ${account.name}`);
            await db.collection('accounts').updateOne({ _id: account._id }, { $set: { initialStatsFetched: true } });

            if (flags.tootStats) {
              this.log(`Fetching initial stats: Fetch toot history for account ${account.name}`);
              await fetchTootstatsForAccount(db, account);

              this.log(`Fetching initial stats: Create initial toot stats for account ${account.name}`);
              await createInitialTootStats(db, account);
            } else {
              this.log(`Fetching initial stats: Skipping toot stats (--no-toot-stats flag)`);
            }

            if (flags.accountStats) {
              this.log(`Fetching initial stats: Create initial account stats for account ${account.name}`);
              await createInitialAccountStats(db, account);
            } else {
              this.log(`Fetching initial stats: Skipping account stats (--no-account-stats flag)`);
            }

            if (!flags.skipEmail) {
              try {
                await axios.post(
                  `${flags.host}/mail/first-stats`,
                  { userID: `${user._id}`, accounts: [account._id] },
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: flags.authorization,
                    },
                  },
                );
                this.log(`Fetching initial stats: Email notification sent to user ${user._id}`);
              } catch (error) {
                this.logError(
                  `Fetching initial stats: Failed to send email notification for user ${user._id}: ${error}`,
                );
              }
            } else {
              this.log(`Fetching initial stats: Skipping email notification (--skip-email flag)`);
            }

            return { recordsProcessed: 1 };
          } else {
            this.logWarning(`Fetching initial stats: Owner of account ${account._id} not found.`);
          }
        } else {
          this.log('Fetching initial stats: Nothing to do.');
        }

        return { recordsProcessed: 0 };
      });
    } finally {
      await connection.close();
    }
  }
}
