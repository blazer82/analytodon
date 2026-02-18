import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { getTimezones } from '../../helpers/getTimezones';
import { getYesterday } from '../../helpers/getYesterday';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class DailyAccountStats extends BaseCommand {
  static description = 'Aggregate daily account stats for all accounts';

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
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(DailyAccountStats);

    this.log('Daily account stats: Aggregation started.');

    const timezones = flags.timezone ? [flags.timezone] : getTimezones([0]); // run at 00:00

    this.log(`Daily account stats: Timezones: ${timezones.join(',')}`);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'aggregate:dailyaccountstats', logger: this }, async () => {
        const accounts = await db
          .collection('accounts')
          .find({
            isActive: true,
            timezone: { $in: timezones },
          })
          .toArray();

        let processed = 0;

        for (const account of accounts) {
          this.log(`Daily account stats: Processing account ${account.name}`);

          try {
            const yesterday = getYesterday(account.timezone);

            const accountStats = await db.collection('accountstats').aggregate([
              {
                $match: {
                  account: account._id,
                  fetchedAt: {
                    $gte: yesterday,
                  },
                },
              },
              {
                $addFields: {
                  day: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$fetchedAt',
                      timezone: String(account.timezone).replace(' ', '_'),
                    },
                  },
                },
              },
              {
                $group: {
                  _id: {
                    $dateFromString: {
                      dateString: '$day',
                      timezone: String(account.timezone).replace(' ', '_'),
                    },
                  },
                  followersCount: {
                    $max: '$followersCount',
                  },
                  followingCount: {
                    $max: '$followingCount',
                  },
                  statusesCount: {
                    $max: '$statusesCount',
                  },
                },
              },
            ]);

            const dbPromises = [];

            while (await accountStats.hasNext()) {
              const stats = (await accountStats.next()) as {
                _id: Date;
                followersCount: number;
                followingCount: number;
                statusesCount: number;
              };

              dbPromises.push(
                db.collection('dailyaccountstats').insertOne({
                  account: account._id,
                  day: stats._id,
                  followersCount: stats.followersCount,
                  followingCount: stats.followingCount,
                  statusesCount: stats.statusesCount,
                }),
              );
            }

            await Promise.all(dbPromises);
            processed++;
            this.log(`Daily account stats: Done for ${account.name}`);
          } catch (error: any) {
            this.logError(`Daily account stats: Failed for ${account.name}: ${error?.message}`);
          }
        }

        this.log('Daily account stats: Aggregation done.');
        return { recordsProcessed: processed };
      });
    } finally {
      await connection.close();
    }
  }
}
