import { Flags } from '@oclif/core';
import { MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { findStaleAccounts, getStaleCutoff, STALE_ACCOUNT_DAYS } from '../../helpers/staleAccounts';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class AccountHealth extends BaseCommand {
  static description = 'Aggregate account health snapshot (stale, incomplete, abandoned)';

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
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(AccountHealth);

    this.log('Account health: Aggregation started.');

    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'aggregate:accounthealth', logger: this }, async () => {
        const now = new Date();
        const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const daysBetween = (from: Date, to: Date) =>
          Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

        const accountsCol = db.collection('accounts');
        const usersCol = db.collection('users');

        const [staleRecords, incompleteAccountsRaw, abandonedUsersRaw] = await Promise.all([
          // Stale accounts: active + setupComplete accounts without new stats for 3+ days
          findStaleAccounts(db, getStaleCutoff(STALE_ACCOUNT_DAYS, now)),

          // Incomplete setups: accounts where setupComplete is false
          accountsCol
            .aggregate([
              { $match: { setupComplete: false } },
              {
                $lookup: {
                  from: 'users',
                  localField: 'owner',
                  foreignField: '_id',
                  as: 'ownerDoc',
                },
              },
              { $unwind: '$ownerDoc' },
              { $sort: { createdAt: 1 } },
            ])
            .toArray(),

          // Abandoned accounts: users with lastLoginAt > 90 days ago or null, who are active
          usersCol
            .aggregate([
              {
                $match: {
                  isActive: true,
                  $or: [
                    { lastLoginAt: { $lt: daysAgo(90) } },
                    { lastLoginAt: null },
                    { lastLoginAt: { $exists: false } },
                  ],
                },
              },
              {
                $lookup: {
                  from: 'accounts',
                  localField: '_id',
                  foreignField: 'owner',
                  as: 'accounts',
                },
              },
              { $match: { 'accounts.0': { $exists: true } } },
              { $sort: { lastLoginAt: 1 } },
            ])
            .toArray(),
        ]);

        // Map stale accounts (accounts without any stats count from their creation date)
        const staleAccounts = staleRecords.map(({ account, owner, lastStatsDate }) => {
          const referenceDate = lastStatsDate ?? (account.createdAt as Date | undefined);
          return {
            accountId: (account._id as ObjectId).toHexString(),
            accountName: account.accountName || account.name || null,
            serverURL: account.serverURL,
            ownerEmail: owner.email,
            lastStatsDate: lastStatsDate ? lastStatsDate.toISOString() : null,
            daysSinceLastUpdate: referenceDate ? daysBetween(referenceDate, now) : 0,
            staleNoticeSentAt: account.staleNoticeSentAt ? (account.staleNoticeSentAt as Date).toISOString() : null,
          };
        });

        // Map incomplete accounts
        const incompleteAccounts = incompleteAccountsRaw.map((doc) => ({
          accountId: (doc._id as ObjectId).toHexString(),
          accountName: doc.accountName || doc.name || null,
          serverURL: doc.serverURL,
          ownerEmail: doc.ownerDoc.email,
          createdDate: (doc.createdAt as Date).toISOString(),
          daysSinceCreation: daysBetween(doc.createdAt as Date, now),
        }));

        // Map abandoned accounts (one entry per account)
        const abandonedAccounts = abandonedUsersRaw.flatMap((user) =>
          (user.accounts as any[]).map((account) => ({
            accountId: (account._id as ObjectId).toHexString(),
            accountName: account.accountName || account.name || null,
            serverURL: account.serverURL,
            ownerEmail: user.email,
            lastLoginDate: user.lastLoginAt ? (user.lastLoginAt as Date).toISOString() : null,
            deletionNoticeSent: user.oldAccountDeletionNoticeSent === true,
          })),
        );

        const data = {
          staleAccounts,
          incompleteAccounts,
          abandonedAccounts,
        };

        await db.collection('accounthealth').insertOne({
          generatedAt: now,
          data,
          createdAt: now,
          updatedAt: now,
        });

        this.log(
          `Account health: Found ${staleAccounts.length} stale, ${incompleteAccounts.length} incomplete, ${abandonedAccounts.length} abandoned.`,
        );
        this.log('Account health: Aggregation done.');
      });
    } finally {
      await connection.close();
    }
  }
}
