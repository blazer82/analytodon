import { Command, Flags } from '@oclif/core';
import axios from 'axios';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { getTimezones } from '../../helpers/getTimezones';
import { logger } from '../../helpers/logger';

export default class WeeklyStats extends Command {
  static args = {};
  static description = 'Send weekly stats email to users';

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
      default: 'analytodon',
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
    timezone: Flags.string({
      char: 'z',
      description: 'Process accounts with this timezone',
    }),
  };

  async run(): Promise<void> {
    logger.info('Send weekly stats email to users');

    try {
      const { flags } = await this.parse(WeeklyStats);

      const timezones = flags.timezone ? [flags.timezone] : getTimezones([6]); // run at 06:00
      logger.info(`Send weekly stats: Timezones: ${timezones.join(',')}`);

      const accountsQuery: Filter<Document> = {
        isActive: true,
        setupComplete: true,
        timezone: { $in: timezones },
        createdAt: {
          $lt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7),
        },
      };

      if (flags.user) {
        logger.info(`Send weekly stats: Only process user ${flags.user}`);
        accountsQuery['owner'] = new ObjectId(flags.user);
      }

      // Connect to database
      const connection = await new MongoClient(flags.connectionString).connect();
      const db = connection.db(flags.database);

      const ownerList = await db.collection('accounts').find(accountsQuery).project({ owner: 1 }).toArray();

      const ownerSet = new Set(ownerList.map(({ owner }) => `${owner}`));

      for (const owner of ownerSet) {
        try {
          // Verify user
          const user = await db.collection('users').findOne({
            _id: new ObjectId(owner),
            emailVerified: true,
            role: 'account-owner',
            isActive: true,
            unsubscribed: { $nin: ['weekly'] },
          });

          if (user) {
            const accounts = await db
              .collection('accounts')
              .find({
                ...accountsQuery,
                owner: user._id,
              })
              .toArray();

            if (accounts.length > 0) {
              const accountIds = accounts.map(({ _id }) => `${_id}`);
              logger.info(`Send weekly stats: Trigger mail for user ${user._id} with accounts ${accountIds.join(',')}`);

              await axios.post(
                `${flags.host}/api/mail/weeklystats`,
                { userID: `${user._id}`, accounts: accountIds },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: flags.authorization,
                  },
                },
              );
            }
          } else {
            logger.info(`Send weekly stats: Skipping user ${owner}`);
          }
        } catch (error: any) {
          logger.error(`Send weekly stats: Failed for user ${owner} with error ${error?.message}`);
        }
      }

      await connection.close();
    } catch (error: any) {
      logger.error(`Send weekly stats: Failed with error ${error?.message}`);
    }
  }
}
