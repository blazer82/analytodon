import { Db, Document, WithId } from 'mongodb';

import { getToday } from '../../helpers/getToday';
import { getYesterday } from '../../helpers/getYesterday';
import { logger } from '../../helpers/logger';

export const generateDailyTootstats = async (
  db: Db,
  account: WithId<Document>,
  options?: { today?: Date; yesterday?: Date; upsert?: boolean },
) => {
  const today = options?.today || getToday(account.timezone);
  const yesterday = options?.yesterday || getYesterday(account.timezone);

  logger.info({ today, yesterday }, `Daily toot stats: Processing account ${account.name}`);

  const boostStats = await db.collection('tootstats').aggregate([
    {
      $match: {
        account: account._id,
        fetchedAt: {
          $lt: today,
        },
      },
    },
    {
      $addFields: {
        day: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: yesterday,
            timezone: String(account.timezone).replace(' ', '_'),
          },
        },
      },
    },
    // group to get the highest count from every toot
    {
      $group: {
        _id: {
          uri: '$uri',
          day: {
            $dateFromString: {
              dateString: '$day',
              timezone: String(account.timezone).replace(' ', '_'),
            },
          },
        },
        repliesCount: {
          $max: '$repliesCount',
        },
        reblogsCount: {
          $max: '$reblogsCount',
        },
        favouritesCount: {
          $max: '$favouritesCount',
        },
      },
    },
    // group to sum up all the metrics from that day
    {
      $group: {
        _id: '$_id.day',
        repliesCount: {
          $sum: '$repliesCount',
        },
        boostsCount: {
          $sum: '$reblogsCount',
        },
        favouritesCount: {
          $sum: '$favouritesCount',
        },
      },
    },
  ]);

  const dbPromises = [];

  while (await boostStats.hasNext()) {
    const stats = (await boostStats.next()) as {
      _id: Date;
      repliesCount: number;
      boostsCount: number;
      favouritesCount: number;
    };

    if (options?.upsert) {
      dbPromises.push(
        db.collection('dailytootstats').updateOne(
          {
            account: account._id,
            day: stats._id,
          },
          {
            $set: {
              account: account._id,
              day: stats._id,
              repliesCount: stats.repliesCount,
              boostsCount: stats.boostsCount,
              favouritesCount: stats.favouritesCount,
            },
          },
          { upsert: true },
        ),
      );
    } else {
      dbPromises.push(
        db.collection('dailytootstats').insertOne(
          {
            account: account._id,
            day: stats._id,
            repliesCount: stats.repliesCount,
            boostsCount: stats.boostsCount,
            favouritesCount: stats.favouritesCount,
          },
          {},
        ),
      );
    }
  }

  await Promise.all(dbPromises);
  logger.info(`Daily toot stats: Done for ${account.name}`);
};
