import { Db } from 'mongodb';

import {
  countActiveAccounts,
  exceedsStaleRatio,
  findStaleAccounts,
  getStaleCutoff,
  selectStaleAccountsForNotice,
} from '../../helpers/staleAccounts';

export interface StaleAccountNoticePayload {
  userID: string;
  accountIDs: string[];
}

export interface SendStaleAccountNoticesOptions {
  /** Days without new stats after which an account counts as stale */
  days: number;
  /** Maximum share (0..1) of stale accounts among all active accounts before sending is aborted */
  maxStaleRatio: number;
  /** Only process this user */
  userID?: string;
  /** Log only, don't send */
  dryRun: boolean;
  /** Triggers the notice email for one user */
  sendNotice: (payload: StaleAccountNoticePayload) => Promise<void>;
  logger: {
    log(message?: string, ...args: any[]): void;
    logError(input: string | Error): void;
  };
  now?: Date;
}

/**
 * Finds stale accounts, groups them by owner and triggers one notice email per owner.
 * Throws (and sends nothing) when the share of stale accounts exceeds `maxStaleRatio`.
 */
export const sendStaleAccountNotices = async (
  db: Db,
  options: SendStaleAccountNoticesOptions,
): Promise<{ recordsProcessed: number }> => {
  const { logger } = options;
  const cutoff = getStaleCutoff(options.days, options.now);

  const [staleRecords, activeCount] = await Promise.all([findStaleAccounts(db, cutoff), countActiveAccounts(db)]);

  logger.log(`Send stale accounts: ${staleRecords.length} of ${activeCount} active accounts are stale.`);

  if (exceedsStaleRatio(staleRecords.length, activeCount, options.maxStaleRatio)) {
    const message = `Send stale accounts: ${staleRecords.length} of ${activeCount} active accounts are stale, which exceeds the maximum ratio of ${options.maxStaleRatio}. This points to a problem with data collection, not with individual accounts. No emails sent.`;
    logger.logError(message);
    throw new Error(message);
  }

  if (options.userID) {
    logger.log(`Send stale accounts: Only process user ${options.userID}`);
  }

  const accountsByUser = selectStaleAccountsForNotice(staleRecords, { userID: options.userID });

  let processed = 0;

  for (const [userID, accountIDs] of accountsByUser) {
    try {
      if (!options.dryRun) {
        logger.log(`Send stale accounts: Trigger mail for user ${userID}, accounts ${accountIDs.join(', ')}`);
        await options.sendNotice({ userID, accountIDs });
      } else {
        logger.log(`Send stale accounts: Trigger mail for user ${userID}, accounts ${accountIDs.join(', ')} (DRY RUN)`);
      }
      processed++;
    } catch (error: any) {
      logger.logError(`Send stale accounts: Failed for user ${userID} with error ${error?.message}`);
    }
  }

  return { recordsProcessed: processed };
};
