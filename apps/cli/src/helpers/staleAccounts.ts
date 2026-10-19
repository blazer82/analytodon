import { Db, Document } from 'mongodb';

/** Number of days without new stats after which an account counts as stale. */
export const STALE_ACCOUNT_DAYS = 3;

export interface StaleAccountRecord {
  /** Raw account document */
  account: Document;
  /** Raw owner (user) document */
  owner: Document;
  /** Latest `dailyaccountstats.day` for the account, or null if it has no stats at all */
  lastStatsDate: Date | null;
}

/**
 * Returns the cutoff date for a given number of days before `now`.
 */
export const getStaleCutoff = (days: number, now: Date = new Date()): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

/**
 * Finds all active, setup-complete accounts that have not received new stats since `cutoff`:
 * - accounts whose latest `dailyaccountstats.day` is older than `cutoff`, and
 * - accounts without any stats that were created before `cutoff`.
 *
 * Shared by `aggregate:accounthealth` and `mail:staleaccounts` so both use the same definition of "stale".
 * Results are sorted by staleness (oldest first): accounts with stats by last stats date,
 * followed by accounts without stats by creation date.
 */
export const findStaleAccounts = async (db: Db, cutoff: Date): Promise<StaleAccountRecord[]> => {
  const [withStats, withoutStats] = await Promise.all([
    db
      .collection('dailyaccountstats')
      .aggregate([
        { $group: { _id: '$account', lastStatsDate: { $max: '$day' } } },
        { $match: { lastStatsDate: { $lt: cutoff } } },
        {
          $lookup: {
            from: 'accounts',
            localField: '_id',
            foreignField: '_id',
            as: 'account',
          },
        },
        { $unwind: '$account' },
        { $match: { 'account.isActive': true, 'account.setupComplete': true } },
        {
          $lookup: {
            from: 'users',
            localField: 'account.owner',
            foreignField: '_id',
            as: 'owner',
          },
        },
        { $unwind: '$owner' },
        { $sort: { lastStatsDate: 1 } },
      ])
      .toArray(),

    db
      .collection('accounts')
      .aggregate([
        {
          $match: {
            isActive: true,
            setupComplete: true,
            // Give freshly connected accounts time to receive their first stats
            $or: [{ createdAt: { $lt: cutoff } }, { createdAt: null }],
          },
        },
        {
          $lookup: {
            from: 'dailyaccountstats',
            localField: '_id',
            foreignField: 'account',
            as: 'stats',
          },
        },
        { $match: { stats: { $size: 0 } } },
        { $project: { stats: 0 } },
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
  ]);

  return [
    ...withStats.map((doc) => ({
      account: doc.account as Document,
      owner: doc.owner as Document,
      lastStatsDate: doc.lastStatsDate as Date,
    })),
    ...withoutStats.map(({ ownerDoc, ...account }) => ({
      account,
      owner: ownerDoc as Document,
      lastStatsDate: null,
    })),
  ];
};

/**
 * Counts all active, setup-complete accounts (the base for the stale ratio).
 */
export const countActiveAccounts = async (db: Db): Promise<number> =>
  db.collection('accounts').countDocuments({ isActive: true, setupComplete: true });

export interface SelectStaleAccountsOptions {
  /** Only select accounts of this user. Skips the owner eligibility checks (for testing). */
  userID?: string;
}

/**
 * Selects the stale accounts whose owners should be notified and groups them by owner.
 * Accounts that were already notified (`staleNoticeSentAt` set) are skipped, as are accounts
 * whose owner is inactive, unverified or not an account owner.
 *
 * @returns Map of user ID to the list of account IDs to notify about.
 */
export const selectStaleAccountsForNotice = (
  records: StaleAccountRecord[],
  options: SelectStaleAccountsOptions = {},
): Map<string, string[]> => {
  const result = new Map<string, string[]>();

  for (const { account, owner } of records) {
    if (account.staleNoticeSentAt) continue;

    const userID = `${owner._id}`;

    if (options.userID) {
      if (userID !== options.userID) continue;
    } else if (owner.isActive !== true || owner.emailVerified !== true || owner.role !== 'account-owner') {
      continue;
    }

    const accountIDs = result.get(userID) ?? [];
    accountIDs.push(`${account._id}`);
    result.set(userID, accountIDs);
  }

  return result;
};

/**
 * Whether the share of stale accounts exceeds `maxRatio`. A high share points to a problem
 * on our side (e.g. fetch jobs down), in which case users must not be told to reconnect.
 */
export const exceedsStaleRatio = (staleCount: number, activeCount: number, maxRatio: number): boolean => {
  if (activeCount <= 0) return staleCount > 0;
  return staleCount / activeCount > maxRatio;
};
