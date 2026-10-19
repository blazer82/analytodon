import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { processInBatches } from '../../helpers/processInBatches';
import { trackJobRun } from '../../helpers/trackJobRun';
import {
  fetchFollowerServersForAccount,
  getRecentlyFetchedAccountIds,
} from '../../service/followerservers/fetchFollowerServers';

export default class FollowerServers extends BaseCommand {
  static description =
    'Gather the distribution of followers across servers for all accounts (refreshes each account about once a week)';

  static examples = [
    `<%= config.bin %> <%= command.id %>`,
    `<%= config.bin %> <%= command.id %> --account 5f7b1c2e9d1e8a0012345678 --force`,
  ];

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
      char: 'm',
      description: 'Only process this account',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Fetch even if a recent snapshot exists',
      default: false,
    }),
    concurrency: Flags.integer({
      char: 'p',
      description: 'Number of Mastodon instances to process in parallel',
      default: 5,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(FollowerServers);

    this.log('Fetching follower servers: Started');

    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'fetch:followerservers', logger: this }, async () => {
        const accountFilter: Filter<Document> = { isActive: true, setupComplete: true };
        if (flags.account) {
          accountFilter._id = new ObjectId(flags.account);
        }

        const recentlyFetched = flags.force ? new Set<string>() : await getRecentlyFetchedAccountIds(db);
        const accounts = (await db.collection('accounts').find(accountFilter).toArray()).filter(
          ({ _id }) => !recentlyFetched.has(String(_id)),
        );

        // Group accounts by Mastodon instance: parallel across instances, sequential within each instance
        const instanceMap = new Map<string, Document[]>();
        for (const account of accounts) {
          const key = account.serverURL as string;
          instanceMap.set(key, [...(instanceMap.get(key) ?? []), account]);
        }
        const groups = [...instanceMap.values()];

        this.log(
          `Fetching follower servers: Processing ${accounts.length} accounts across ${groups.length} instances (concurrency: ${flags.concurrency})`,
        );

        let processed = 0;

        await processInBatches(flags.concurrency, groups, async (instanceAccounts) => {
          for (const account of instanceAccounts) {
            try {
              const snapshot = await fetchFollowerServersForAccount(db, account, { logger: this });
              if (snapshot) processed++;
            } catch (error: any) {
              this.logError(
                `Fetching follower servers: Failed to process account ${account.name} (${account._id}): ${error?.message || error}`,
              );
            }
          }
        });

        this.log('Fetching follower servers: Done');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
