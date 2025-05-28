import generator from 'megalodon';
import { Db, Document } from 'mongodb';

import { decryptText } from './encryption';
import { getDateInTimezone } from './getDateInTimezone';
import { logger } from './logger';
import { processInBatches } from './processInBatches';

const BATCH_SIZE = 5;

export const createInitialTootStats = async (db: Db, account: Document) => {
  logger.info(`Create initial toot stats: Processing account ${account.name}`);

  const credentials = await db.collection('accountcredentials').findOne({ account: account._id });

  if (!credentials?.accessToken) {
    logger.warn(`Create initial toot stats: Access token not found for ${account.name}`);
    return;
  }

  const decryptedAccessToken = decryptText(credentials.accessToken);
  if (!decryptedAccessToken) {
    logger.error(`Create initial toot stats: Failed to decrypt access token for ${account.name}. Skipping.`);
    return;
  }

  try {
    const mastodon = generator('mastodon', account.serverURL, decryptedAccessToken);

    const userInfo = await mastodon.verifyAccountCredentials();

    const statsList: { day: Date; repliesCount: number; boostsCount: number; favouritesCount: number }[] = [];

    const startDate = getDateInTimezone(new Date(userInfo.data.created_at), account.timezone);
    const endDate = getDateInTimezone(new Date(account.createdAt), account.timezone);
    endDate.setDate(endDate.getDate() - 1);

    const day = new Date(startDate);
    while (day <= endDate) {
      statsList.push({ day: new Date(day), repliesCount: 0, boostsCount: 0, favouritesCount: 0 });
      day.setDate(day.getDate() + 1);
    }

    let actualStartDate = new Date(endDate);

    const runningTotal = {
      repliesCount: 0,
      boostsCount: 0,
      favouritesCount: 0,
    };

    const toots = await db.collection('toots').find(
      {
        account: account._id,
      },
      { sort: { createdAt: 1 } },
    );

    while (await toots.hasNext()) {
      const toot = await toots.next();

      if (toot) {
        const tootDate = getDateInTimezone(new Date(toot.createdAt), account.timezone);

        runningTotal.repliesCount += toot.repliesCount;
        runningTotal.boostsCount += toot.reblogsCount;
        runningTotal.favouritesCount += toot.favouritesCount;

        const index = statsList.findIndex(({ day }) => day.getTime() === tootDate.getTime());
        if (index >= 0) {
          statsList[index].repliesCount = runningTotal.repliesCount;
          statsList[index].boostsCount = runningTotal.boostsCount;
          statsList[index].favouritesCount = runningTotal.favouritesCount;
        } else {
          logger.warn(
            `Create initial toot stats: Toot date ${tootDate.toISOString()} not found in stats list for account ${account.name}.`,
          );
        }

        if (tootDate.getTime() < actualStartDate.getTime()) {
          actualStartDate = new Date(tootDate);
        }
      }
    }

    const croppedStatsList = statsList.filter(({ day }) => day.getTime() >= actualStartDate.getTime());

    const calculatedStatsList = croppedStatsList.reduce(
      (carry, stats, index) => {
        if (!carry.length) {
          return [{ ...stats }];
        } else if (!stats.repliesCount && !stats.boostsCount && !stats.favouritesCount) {
          return [
            ...carry,
            {
              ...stats,
              repliesCount: carry[index - 1].repliesCount,
              boostsCount: carry[index - 1].boostsCount,
              favouritesCount: carry[index - 1].favouritesCount,
            },
          ];
        }
        return [
          ...carry,
          {
            ...stats,
          },
        ];
      },
      [] as typeof statsList,
    );

    await processInBatches(BATCH_SIZE, calculatedStatsList, (stats) =>
      db.collection('dailytootstats').insertOne({
        account: account._id,
        day: stats.day,
        repliesCount: stats.repliesCount,
        boostsCount: stats.boostsCount,
        favouritesCount: stats.favouritesCount,
      }),
    );
  } catch (error: any) {
    logger.error(
      `Create initial toot stats: Error while processing ${account.name} (${account._id}): ${error?.message}`,
    );
  }
};
