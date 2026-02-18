import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';

export default class AdminStats extends BaseCommand {
  static description = 'Aggregate platform-wide admin statistics snapshot';

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
    const { flags } = await this.parse(AdminStats);

    this.log('Admin stats: Aggregation started.');

    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      const now = new Date();
      const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const usersCol = db.collection('users');
      const accountsCol = db.collection('accounts');

      const [
        // User counts
        totalUsers,
        activeUsers,
        inactiveUsers,
        emailVerifiedUsers,
        adminUsers,
        accountOwnerUsers,
        // Login activity
        loginLast7Days,
        loginLast30Days,
        loginLast90Days,
        // Account counts
        totalAccounts,
        setupCompleteAccounts,
        setupIncompleteAccounts,
        activeAccounts,
        inactiveAccounts,
        // Data volume
        totalToots,
        totalDailyAccountStats,
        totalDailyTootStats,
        // Aggregations
        registrationTrend,
        serverDistribution,
      ] = await Promise.all([
        // User counts
        usersCol.countDocuments({}),
        usersCol.countDocuments({ isActive: true }),
        usersCol.countDocuments({ isActive: false }),
        usersCol.countDocuments({ emailVerified: true }),
        usersCol.countDocuments({ role: 'admin' }),
        usersCol.countDocuments({ role: 'account-owner' }),
        // Login activity
        usersCol.countDocuments({ lastLoginAt: { $gte: daysAgo(7) } }),
        usersCol.countDocuments({ lastLoginAt: { $gte: daysAgo(30) } }),
        usersCol.countDocuments({ lastLoginAt: { $gte: daysAgo(90) } }),
        // Account counts
        accountsCol.countDocuments({}),
        accountsCol.countDocuments({ setupComplete: true }),
        accountsCol.countDocuments({ setupComplete: false }),
        accountsCol.countDocuments({ isActive: true }),
        accountsCol.countDocuments({ isActive: false }),
        // Data volume
        db.collection('toots').countDocuments({}),
        db.collection('dailyaccountstats').countDocuments({}),
        db.collection('dailytootstats').countDocuments({}),
        // Aggregations
        usersCol
          .aggregate<{ _id: string; count: number }>([
            { $match: { createdAt: { $gte: daysAgo(30) } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray(),
        accountsCol
          .aggregate<{
            _id: string;
            count: number;
          }>([{ $group: { _id: '$serverURL', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }])
          .toArray(),
      ]);

      const dailyBreakdown = registrationTrend.map((item) => ({
        date: item._id,
        count: item.count,
      }));

      const registrationLast30DaysCount = dailyBreakdown.reduce((sum, day) => sum + day.count, 0);

      const data = {
        users: {
          totalCount: totalUsers,
          activeCount: activeUsers,
          inactiveCount: inactiveUsers,
          emailVerifiedCount: emailVerifiedUsers,
          roleBreakdown: {
            admin: adminUsers,
            accountOwner: accountOwnerUsers,
          },
          registrations: {
            last30DaysCount: registrationLast30DaysCount,
            dailyBreakdown,
          },
          loginActivity: {
            last7Days: loginLast7Days,
            last30Days: loginLast30Days,
            last90Days: loginLast90Days,
          },
        },
        accounts: {
          totalCount: totalAccounts,
          setupCompleteCount: setupCompleteAccounts,
          setupIncompleteCount: setupIncompleteAccounts,
          activeCount: activeAccounts,
          inactiveCount: inactiveAccounts,
          serverDistribution: serverDistribution.map((item) => ({
            serverURL: item._id,
            count: item.count,
          })),
        },
        dataVolume: {
          totalToots,
          totalDailyAccountStats,
          totalDailyTootStats,
        },
      };

      await db.collection('adminstats').insertOne({
        generatedAt: now,
        data,
        createdAt: now,
        updatedAt: now,
      });

      this.log('Admin stats: Snapshot saved successfully.');
    } catch (error: any) {
      this.logError(`Admin stats: Failed: ${error?.message}`);
    }

    await connection.close();

    this.log('Admin stats: Aggregation done.');
  }
}
