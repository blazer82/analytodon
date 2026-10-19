import { Db } from 'mongodb';

import {
  countActiveAccounts,
  countNewlyStale,
  exceedsStaleRatio,
  findStaleAccounts,
  getStaleCutoff,
  resetRecoveredStaleNotices,
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
 * Clears the notice flag of recovered accounts, then finds stale accounts, groups them by owner and
 * triggers one notice email per owner.
 * Throws (and sends nothing) when the share of newly stale accounts exceeds `maxStaleRatio`, except
 * in dry run mode where the selection is still logged. Also throws if every notice failed to send.
 */
export const sendStaleAccountNotices = async (
  db: Db,
  options: SendStaleAccountNoticesOptions,
): Promise<{ recordsProcessed: number }> => {
  const { logger } = options;
  const dryRunSuffix = options.dryRun ? ' (DRY RUN)' : '';
  const cutoff = getStaleCutoff(options.days, options.now);

  const [staleRecords, activeCount] = await Promise.all([findStaleAccounts(db, cutoff), countActiveAccounts(db)]);

  // Accounts that are no longer stale get their flag cleared, so a future outage triggers a new notice
  const recoveredIDs = await resetRecoveredStaleNotices(db, staleRecords, {
    dryRun: options.dryRun,
    userID: options.userID,
  });
  if (recoveredIDs.length > 0) {
    logger.log(
      `Send stale accounts: Reset stale notice for recovered accounts ${recoveredIDs.join(', ')}${dryRunSuffix}`,
    );
  }

  const { newlyStale, base } = countNewlyStale(staleRecords, activeCount);
  logger.log(
    `Send stale accounts: ${staleRecords.length} of ${activeCount} active accounts are stale, ${newlyStale} of ${base} newly stale.`,
  );

  if (exceedsStaleRatio(newlyStale, base, options.maxStaleRatio)) {
    const message = `Send stale accounts: ${newlyStale} of ${base} accounts are newly stale, which exceeds the maximum ratio of ${options.maxStaleRatio}. This points to a problem with data collection, not with individual accounts. No emails sent.`;
    logger.logError(message);
    if (!options.dryRun) {
      throw new Error(message);
    }
  }

  if (options.userID) {
    logger.log(`Send stale accounts: Only process user ${options.userID}`);
  }

  const accountsByUser = selectStaleAccountsForNotice(staleRecords, { userID: options.userID });

  let processed = 0;

  for (const [userID, accountIDs] of accountsByUser) {
    try {
      logger.log(
        `Send stale accounts: Trigger mail for user ${userID}, accounts ${accountIDs.join(', ')}${dryRunSuffix}`,
      );
      if (!options.dryRun) {
        await options.sendNotice({ userID, accountIDs });
      }
      processed++;
    } catch (error: any) {
      logger.logError(`Send stale accounts: Failed for user ${userID} with error ${error?.message}`);
    }
  }

  if (accountsByUser.size > 0 && processed === 0) {
    throw new Error(`Send stale accounts: Failed to send all ${accountsByUser.size} notices.`);
  }

  return { recordsProcessed: processed };
};
