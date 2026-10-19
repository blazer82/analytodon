import { Entity, MegalodonInterface, Response } from 'megalodon';
import { Db, Document } from 'mongodb';

import { createMastodonClient } from '../../helpers/createMastodonClient';
import { decryptText } from '../../helpers/encryption';

export const PAGE_LIMIT = 80;
export const MAX_FOLLOWERS = 10000; // 125 requests at 80 per page
const PAUSE_INTERVAL = 9;
const PAUSE_MS = 2000;
const MAX_RETRIES = 5;
// Accounts are refreshed when their latest snapshot is older than this. Slightly less than a week so a daily
// cron run refreshes each account once a week despite small differences in run time.
export const REFRESH_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000;

// HTTP statuses that mean the server won't give us the follower list
const HIDDEN_STATUSES = [401, 403, 404, 410];

export interface FollowerServersLogger {
  log: (message: string) => void;
  logWarning: (message: string) => void;
}

export interface FetchFollowerServersOptions {
  logger: FollowerServersLogger;
  createClient?: (serverURL: string, accessToken: string) => MegalodonInterface;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  maxFollowers?: number;
}

export interface FollowerServerSnapshot {
  account: unknown;
  day: Date;
  totalFollowers: number;
  sampledFollowers: number;
  homeServer: string;
  servers: { domain: string; count: number }[];
  hidden?: boolean;
  fetchedAt: Date;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Returns the server domain of a follower. Local followers have no domain part in their acct.
 */
export const getDomainFromAcct = (acct: string, homeServer: string): string => {
  const at = acct.lastIndexOf('@');
  const domain = at >= 0 ? acct.slice(at + 1) : '';
  return (domain || homeServer).toLowerCase();
};

export const getHomeServer = (serverURL: string): string => {
  try {
    return new URL(serverURL).hostname.toLowerCase();
  } catch {
    return serverURL
      .replace(/^https?:\/\//, '')
      .replace(/[/:].*$/, '')
      .toLowerCase();
  }
};

/**
 * Extracts the max_id cursor of the "next" page from a Mastodon Link header.
 * Follower pages are paginated by follow relationship IDs, not account IDs, so the cursor must come from the header.
 */
export const getNextMaxId = (linkHeader: string | undefined | null): string | undefined => {
  if (!linkHeader) return undefined;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>\s*;.*rel="?next"?/);
    if (match) {
      try {
        return new URL(match[1]).searchParams.get('max_id') ?? undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

const getStartOfUTCDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * Pages through an account's followers and stores aggregated counts per server.
 * Returns the stored snapshot, or null when nothing was stored (e.g. missing credentials or a transient error,
 * in which case the account is retried on the next run).
 */
export const fetchFollowerServersForAccount = async (
  db: Db,
  account: Document,
  options: FetchFollowerServersOptions,
): Promise<FollowerServerSnapshot | null> => {
  const {
    logger,
    createClient = createMastodonClient,
    sleep = defaultSleep,
    now = () => new Date(),
    maxFollowers = MAX_FOLLOWERS,
  } = options;

  const credentials = await db.collection('accountcredentials').findOne({ account: account._id });
  if (!credentials?.accessToken) {
    logger.logWarning(`Fetching follower servers: Access token not found for ${account.name}`);
    return null;
  }

  const accessToken = decryptText(credentials.accessToken);
  if (!accessToken) {
    logger.logWarning(`Fetching follower servers: Failed to decrypt access token for ${account.name}. Skipping.`);
    return null;
  }

  const mastodon = createClient(account.serverURL, accessToken);
  const homeServer = getHomeServer(account.serverURL);

  const userInfo = await mastodon.verifyAccountCredentials();
  const totalFollowers = userInfo.data.followers_count ?? 0;

  const counts = new Map<string, number>();
  let sampledFollowers = 0;
  let hidden = false;
  let maxId: string | undefined = undefined;
  let iteration = 0;

  while (sampledFollowers < maxFollowers) {
    iteration++;
    if (iteration % PAUSE_INTERVAL === 0) {
      await sleep(PAUSE_MS);
    }

    let response: Response<Array<Entity.Account>> | undefined;
    let retries = 0;
    while (!response) {
      try {
        response = await mastodon.getAccountFollowers(userInfo.data.id, { limit: PAGE_LIMIT, max_id: maxId });
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 429 && retries < MAX_RETRIES) {
          retries++;
          const delay = Math.pow(2, retries) * 15000;
          logger.logWarning(
            `Fetching follower servers: Received 429 for ${account.name}. Retrying in ${delay / 1000} seconds (attempt ${retries}/${MAX_RETRIES}).`,
          );
          await sleep(delay);
        } else if (iteration === 1 && HIDDEN_STATUSES.includes(status)) {
          hidden = true;
          break;
        } else {
          throw error;
        }
      }
    }

    if (!response) break; // hidden

    const followers = response.data ?? [];
    if (iteration === 1 && followers.length === 0 && totalFollowers > 0) {
      // The server reports followers but won't list them
      hidden = true;
      break;
    }

    for (const follower of followers.slice(0, maxFollowers - sampledFollowers)) {
      const domain = getDomainFromAcct(follower.acct ?? '', homeServer);
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
      sampledFollowers++;
    }

    maxId = getNextMaxId(response.headers?.link);
    if (!maxId || followers.length === 0) break;
  }

  const fetchedAt = now();
  const snapshot: FollowerServerSnapshot = {
    account: account._id,
    day: getStartOfUTCDay(fetchedAt),
    totalFollowers,
    sampledFollowers: hidden ? 0 : sampledFollowers,
    homeServer,
    servers: hidden
      ? []
      : [...counts.entries()]
          .map(([domain, count]) => ({ domain, count }))
          .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    fetchedAt,
  };
  if (hidden) snapshot.hidden = true;

  await db.collection('followerserversnapshots').insertOne({ ...snapshot });

  logger.log(
    hidden
      ? `Fetching follower servers: Follower list not available for ${account.name}`
      : `Fetching follower servers: Counted ${sampledFollowers} of ${totalFollowers} followers on ${snapshot.servers.length} servers for ${account.name}`,
  );

  return snapshot;
};

/**
 * Returns the IDs of accounts that already have a snapshot newer than the refresh interval.
 */
export const getRecentlyFetchedAccountIds = async (db: Db, now: Date = new Date()): Promise<Set<string>> => {
  const recent = await db
    .collection('followerserversnapshots')
    .distinct('account', { fetchedAt: { $gt: new Date(now.getTime() - REFRESH_INTERVAL_MS) } });
  return new Set(recent.map((id) => String(id)));
};
