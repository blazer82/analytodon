import generator, { Entity, Response } from 'megalodon';
import { Db, Document } from 'mongodb';

import { decryptText } from './encryption';
import { logger } from './logger';

const MAX_ITERATIONS = 200;
const MAX_AGE = 5184000000; // 60 days
const PAUSE_INTERVAL = 9;
const PAUSE_MS = 2000;
const QUERY_LIMIT = 50;

export const fetchTootstatsForAccount = async (db: Db, account: Document) => {
  logger.info(`Fetching toot stats: Processing account ${account.name}`);

  const credentials = await db.collection('accountcredentials').findOne({ account: account._id });

  if (!credentials?.accessToken) {
    logger.info(`Fetching toot stats: Access token not found for ${account.name}`);
    return;
  }

  const decryptedAccessToken = decryptText(credentials.accessToken);
  if (!decryptedAccessToken) {
    logger.error(`Fetching toot stats: Failed to decrypt access token for ${account.name}. Skipping.`);
    return;
  }

  try {
    const mastodon = generator('mastodon', account.serverURL, decryptedAccessToken);

    let pagingCursor = undefined;

    let more = true;
    let iterationCount = 0;

    const userInfo = await mastodon.verifyAccountCredentials();

    while (more) {
      iterationCount++;

      if (iterationCount % PAUSE_INTERVAL === 0) {
        logger.info(`Fetching toot stats: Pausing for ${account.name}`);
        await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      }

      let statusesResponse: Response<Array<Entity.Status>>;
      let retries = 0;
      const maxRetries = 5;
      while (true) {
        try {
          statusesResponse = await mastodon.getAccountStatuses(userInfo.data.id, {
            limit: QUERY_LIMIT,
            exclude_reblogs: true,
            max_id: pagingCursor,
          });
          break;
        } catch (error: any) {
          if (error.response?.status === 429 && retries < maxRetries) {
            retries++;
            const delay = Math.pow(2, retries) * 15000;
            logger.warn(
              `Fetching toot stats: Received 429 for ${account.name}. Retrying in ${
                delay / 1000
              } seconds (attempt ${retries}/${maxRetries}).`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }

      const unfilteredStatusList = statusesResponse.data ?? [];
      if (unfilteredStatusList.length > 0) {
        const statusList = unfilteredStatusList.filter(({ visibility }) => ['public', 'unlisted'].includes(visibility));

        if (statusList.length > 0) {
          logger.info(
            `Fetching toot stats: Updating ${statusList.length} toots for ${account.name} from ${statusList[0].id} to ${
              statusList[statusList.length - 1].id
            }`,
          );

          const updatePromises = [];

          for (const status of statusList) {
            const toot = {
              uri: status.uri,
              url: status.url,
              content: status.content,
              visibility: status.visibility,
              tags: status.tags,
              language: status.language,
              repliesCount: status.replies_count,
              reblogsCount: status.reblogs_count,
              favouritesCount: status.favourites_count,
              createdAt: new Date(status.created_at),
            };

            const tootStats = {
              repliesCount: status.replies_count,
              reblogsCount: status.reblogs_count,
              favouritesCount: status.favourites_count,
            };

            updatePromises.push(
              db.collection('toots').updateOne(
                { uri: toot.uri },
                {
                  $set: {
                    account: account._id,
                    ...toot,
                    fetchedAt: new Date(),
                  },
                },
                { upsert: true },
              ),
            );

            updatePromises.push(
              db.collection('tootstats').insertOne({
                uri: toot.uri,
                account: account._id,
                ...tootStats,
                fetchedAt: new Date(),
              }),
            );
          }

          await Promise.all(updatePromises);
        }

        pagingCursor = unfilteredStatusList[unfilteredStatusList.length - 1].id;
        more = true;
      }

      logger.info(`Fetching toot stats: Done for ${account.name}`);

      if (
        iterationCount >= MAX_ITERATIONS ||
        unfilteredStatusList.length <= 0 ||
        (account.tootHistoryComplete &&
          new Date().getTime() - new Date(unfilteredStatusList[unfilteredStatusList.length - 1].created_at).getTime() >
            MAX_AGE)
      ) {
        more = false;

        logger.info(`Fetching toot stats: Status list empty or limit reached for ${account.name}, resetting cursor`);

        pagingCursor = undefined;

        await db.collection('accounts').updateOne(
          { _id: account._id },
          {
            $set: {
              tootHistoryComplete: true,
            },
          },
        );
      }
    }
  } catch (error: any) {
    logger.error(`Fetching toot stats: Error while processing ${account.name} (${account._id}): ${error?.message}`);
  }
};
