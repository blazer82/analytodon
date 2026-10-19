import { Flags } from '@oclif/core';
import axios from 'axios';
import { MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { STALE_ACCOUNT_DAYS } from '../../helpers/staleAccounts';
import { trackJobRun } from '../../helpers/trackJobRun';
import { sendStaleAccountNotices } from '../../service/staleaccounts/sendStaleAccountNotices';

export default class StaleAccounts extends BaseCommand {
  static args = {};
  static description = 'Notify users once when stats for one of their accounts stop updating';

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
    days: Flags.integer({
      description: 'Days without new stats after which an account counts as stale',
      default: STALE_ACCOUNT_DAYS,
      min: 1,
    }),
    maxStaleRatio: Flags.custom<number>({
      description: 'Send nothing if more than this share (0-1) of all active accounts is stale',
      default: 0.2,
      parse: async (input) => {
        const value = Number(input);
        if (input.trim() === '' || !Number.isFinite(value) || value < 0 || value > 1) {
          throw new Error(`Expected a number between 0 and 1 but received: ${input}`);
        }
        return value;
      },
    })(),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StaleAccounts);

    this.log('Send stale accounts email to users started.');

    const userID = flags.user ? new ObjectId(flags.user).toHexString() : undefined;

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'mail:staleaccounts', logger: this }, async () => {
        const result = await sendStaleAccountNotices(db, {
          days: flags.days,
          maxStaleRatio: flags.maxStaleRatio,
          userID,
          dryRun: flags.dryRun,
          logger: this,
          sendNotice: async (payload) => {
            await axios.post(`${flags.host}/mail/stale-account`, payload, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: flags.authorization,
              },
            });
          },
        });

        this.log('Send stale accounts email to users done.');
        return result;
      });
    } finally {
      await connection.close();
    }
  }
}
