import { Db, Document, WithId } from 'mongodb';

import { getYesterday } from '../../helpers/getYesterday';
import { logger } from '../../helpers/logger';

export interface GenerateHashtagStatsOptions {
  since?: Date;
  full?: boolean;
}

export const generateHashtagStats = async (
  db: Db,
  account: WithId<Document>,
  options?: GenerateHashtagStatsOptions,
) => {
  const timezone = String(account.timezone).replace(' ', '_');

  let matchStage: Document;
  if (options?.full) {
    matchStage = {
      account: account._id,
      tags: { $exists: true, $ne: [] },
    };
  } else if (options?.since) {
    matchStage = {
      account: account._id,
      tags: { $exists: true, $ne: [] },
      createdAt: { $gte: options.since },
    };
  } else {
    const yesterday = getYesterday(account.timezone);
    matchStage = {
      account: account._id,
      tags: { $exists: true, $ne: [] },
      createdAt: { $gte: yesterday },
    };
  }

  logger.info(`Hashtag stats: Processing account ${account.name}`);

  const cursor = db.collection('toots').aggregate([
    { $match: matchStage },
    { $unwind: '$tags' },
    {
      $addFields: {
        day: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone,
          },
        },
        normalizedTag: { $toLower: '$tags.name' },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateFromString: {
              dateString: '$day',
              timezone,
            },
          },
          hashtag: '$normalizedTag',
        },
        tootCount: { $sum: 1 },
        repliesCount: { $sum: '$repliesCount' },
        reblogsCount: { $sum: '$reblogsCount' },
        favouritesCount: { $sum: '$favouritesCount' },
      },
    },
  ]);

  const dbPromises: Promise<any>[] = [];

  while (await cursor.hasNext()) {
    const stats = (await cursor.next()) as {
      _id: { day: Date; hashtag: string };
      tootCount: number;
      repliesCount: number;
      reblogsCount: number;
      favouritesCount: number;
    };

    dbPromises.push(
      db.collection('hashtagstats').updateOne(
        {
          account: account._id,
          day: stats._id.day,
          hashtag: stats._id.hashtag,
        },
        {
          $set: {
            account: account._id,
            day: stats._id.day,
            hashtag: stats._id.hashtag,
            tootCount: stats.tootCount,
            repliesCount: stats.repliesCount,
            reblogsCount: stats.reblogsCount,
            favouritesCount: stats.favouritesCount,
          },
        },
        { upsert: true },
      ),
    );
  }

  await Promise.all(dbPromises);
  logger.info(`Hashtag stats: Done for ${account.name}`);
};
