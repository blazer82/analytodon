import { Db, Document, Filter } from 'mongodb';

// Collections holding per-account data, all referencing the account by its ObjectId in the `account` field
export const ACCOUNT_DATA_COLLECTIONS = [
  'accountcredentials',
  'accountstats',
  'dailyaccountstats',
  'dailytootstats',
  'followerserversnapshots',
  'hashtagstats',
  'toots',
  'tootstats',
];

export interface CleanupAccountDataLogger {
  log: (message: string) => void;
  logWarning: (message: string) => void;
}

export interface CleanupAccountDataOptions {
  dryRun: boolean;
  logger: CleanupAccountDataLogger;
}

/**
 * Removes data of accounts that no longer exist from all account data collections.
 * Returns the number of removed (or, in a dry run, removable) documents.
 */
export async function cleanupAccountData(db: Db, { dryRun, logger }: CleanupAccountDataOptions): Promise<number> {
  const accountIds = (
    await db
      .collection('accounts')
      .find({}, { projection: { _id: 1 } })
      .toArray()
  ).map(({ _id }) => _id);

  if (accountIds.length === 0) {
    logger.logWarning('Clean up account data: Something went wrong, no changes made.');
    return 0;
  }

  const filter: Filter<Document> = {
    account: { $nin: accountIds },
  };

  let totalDeleted = 0;

  for (const collection of ACCOUNT_DATA_COLLECTIONS) {
    if (!dryRun) {
      const { deletedCount } = await db.collection(collection).deleteMany(filter);
      totalDeleted += deletedCount;
      logger.log(`Clean up account data: Removed ${deletedCount} ${collection}`);
    } else {
      const count = await db.collection(collection).countDocuments(filter);
      totalDeleted += count;
      logger.log(`Clean up account data: Removed ${count} ${collection} (DRY RUN)`);
    }
  }

  logger.log('Clean up account data: Done');
  return totalDeleted;
}
