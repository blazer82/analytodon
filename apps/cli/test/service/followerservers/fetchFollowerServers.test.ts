import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { encryptText } from '../../../src/helpers/encryption';
import {
  fetchFollowerServersForAccount,
  getDomainFromAcct,
  getHomeServer,
  getNextMaxId,
  getRecentlyFetchedAccountIds,
  REFRESH_INTERVAL_MS,
} from '../../../src/service/followerservers/fetchFollowerServers';

// The encryption helper reads the key lazily on first use
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

const linkTo = (maxId: string) =>
  `<https://home.example/api/v1/accounts/1/followers?limit=80&max_id=${maxId}>; rel="next", <https://home.example/api/v1/accounts/1/followers?limit=80&since_id=999>; rel="prev"`;

describe('fetchFollowerServers', () => {
  describe('getDomainFromAcct', () => {
    it('uses the domain part of remote accounts', () => {
      expect(getDomainFromAcct('alice@Mastodon.Social', 'home.example')).to.equal('mastodon.social');
    });

    it('normalizes case and trailing dots', () => {
      expect(getDomainFromAcct('alice@Mastodon.Social.', 'home.example')).to.equal('mastodon.social');
    });

    it('uses the home server for local accounts', () => {
      expect(getDomainFromAcct('bob', 'home.example')).to.equal('home.example');
    });
  });

  describe('getHomeServer', () => {
    it('returns the hostname of the server URL', () => {
      expect(getHomeServer('https://Home.Example')).to.equal('home.example');
      expect(getHomeServer('home.example/')).to.equal('home.example');
      expect(getHomeServer('https://home.example.')).to.equal('home.example');
    });
  });

  describe('getNextMaxId', () => {
    it('returns the max_id of the next link', () => {
      expect(getNextMaxId(linkTo('12345'))).to.equal('12345');
    });

    it('returns undefined without a next link', () => {
      expect(getNextMaxId(undefined)).to.equal(undefined);
      expect(getNextMaxId('<https://home.example/x?since_id=1>; rel="prev"')).to.equal(undefined);
    });
  });

  describe('fetchFollowerServersForAccount', () => {
    let inserted: any[];
    let credentials: any;
    let pages: { data: { acct: string }[]; link?: string }[];
    let followerCalls: any[];
    let followersError: any;
    let followersCount: number;
    let sleeps: number[];
    let warnings: string[];
    let mockDb: any;
    let clientOptions: any;

    const account = { _id: new ObjectId(), name: 'Test', serverURL: 'https://home.example' };
    const now = new Date('2026-10-14T15:30:00.000Z');

    const mockClient = (_serverURL: string, _token: string, options: any) => {
      clientOptions = options;
      return {
        verifyAccountCredentials: async () => ({ data: { id: '1', followers_count: followersCount } }),
        getAccountFollowers: async (_id: string, options: any) => {
          followerCalls.push(options);
          if (followersError) {
            const error = followersError;
            followersError = followersError.once ? null : followersError;
            throw error;
          }
          const page = pages[followerCalls.length - 1] ?? { data: [] };
          return { data: page.data, headers: { link: page.link }, status: 200, statusText: 'OK' };
        },
      } as any;
    };

    const run = (maxFollowers?: number) =>
      fetchFollowerServersForAccount(mockDb, account, {
        logger: { log: () => {}, logWarning: (message) => warnings.push(message) },
        createClient: mockClient,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        now: () => now,
        maxFollowers,
      });

    beforeEach(() => {
      inserted = [];
      credentials = { account: account._id, accessToken: encryptText('token') };
      pages = [];
      followerCalls = [];
      followersError = null;
      followersCount = 0;
      sleeps = [];
      warnings = [];
      mockDb = {
        collection: (name: string) => ({
          findOne: async () => {
            expect(name).to.equal('accountcredentials');
            return credentials;
          },
          insertOne: async (doc: any) => {
            expect(name).to.equal('followerserversnapshots');
            inserted.push(doc);
            return { insertedId: new ObjectId() };
          },
        }),
      };
    });

    it('pages through followers and stores only aggregated counts', async () => {
      followersCount = 5;
      pages = [
        { data: [{ acct: 'a@mastodon.social' }, { acct: 'b' }, { acct: 'c@mastodon.social' }], link: linkTo('100') },
        { data: [{ acct: 'd@fosstodon.org' }, { acct: 'e' }] },
      ];

      const snapshot = await run();

      expect(followerCalls).to.deep.equal([
        { limit: 80, max_id: undefined },
        { limit: 80, max_id: '100' },
      ]);
      expect(inserted).to.have.length(1);
      expect(inserted[0]).to.deep.equal({
        account: account._id,
        day: new Date('2026-10-14T00:00:00.000Z'),
        totalFollowers: 5,
        sampledFollowers: 5,
        homeServer: 'home.example',
        servers: [
          { domain: 'home.example', count: 2 },
          { domain: 'mastodon.social', count: 2 },
          { domain: 'fosstodon.org', count: 1 },
        ],
        fetchedAt: now,
      });
      expect(JSON.stringify(inserted[0])).not.to.contain('a@mastodon.social');
      expect(snapshot?.sampledFollowers).to.equal(5);
    });

    it('stops at the follower cap and marks the snapshot as a sample', async () => {
      followersCount = 10;
      pages = [
        { data: [{ acct: 'a' }, { acct: 'b' }, { acct: 'c@x.example' }], link: linkTo('1') },
        { data: [{ acct: 'd' }, { acct: 'e' }, { acct: 'f' }], link: linkTo('2') },
      ];

      await run(4);

      expect(followerCalls).to.have.length(2);
      expect(inserted[0].sampledFollowers).to.equal(4);
      expect(inserted[0].totalFollowers).to.equal(10);
      expect(inserted[0].servers).to.deep.equal([
        { domain: 'home.example', count: 3 },
        { domain: 'x.example', count: 1 },
      ]);
    });

    it('stores a hidden snapshot when the server refuses the follower list', async () => {
      followersCount = 10;
      followersError = httpError(403);

      await run();

      expect(inserted[0]).to.include({ hidden: true, totalFollowers: 10, sampledFollowers: 0 });
      expect(inserted[0].servers).to.deep.equal([]);
    });

    it('stores a hidden snapshot when the server returns no followers despite a follower count', async () => {
      followersCount = 10;
      pages = [{ data: [] }];

      await run();

      expect(inserted[0]).to.include({ hidden: true });
    });

    it('stores an empty snapshot for accounts without followers', async () => {
      followersCount = 0;
      pages = [{ data: [] }];

      await run();

      expect(inserted[0]).to.not.have.property('hidden');
      expect(inserted[0]).to.include({ totalFollowers: 0, sampledFollowers: 0 });
    });

    it('retries after rate limiting', async () => {
      followersCount = 1;
      followersError = Object.assign(httpError(429), { once: true });
      pages = [{ data: [] }, { data: [{ acct: 'a' }] }];

      await run();

      expect(sleeps).to.deep.equal([30000]);
      expect(warnings[0]).to.contain('429');
      expect(inserted[0].sampledFollowers).to.equal(1);
    });

    it('creates the client with a request timeout', async () => {
      pages = [{ data: [] }];

      await run();

      expect(clientOptions).to.deep.equal({ timeoutMs: 30000 });
    });

    it('does not store anything on 401 after the credentials were verified', async () => {
      followersCount = 10;
      followersError = httpError(401);

      let caught: any;
      try {
        await run();
      } catch (error) {
        caught = error;
      }

      expect(caught?.message).to.equal('HTTP 401');
      expect(inserted).to.have.length(0);
    });

    it('stores an available snapshot when a small follower count is stale', async () => {
      followersCount = 2;
      pages = [{ data: [] }];

      await run();

      expect(inserted[0]).to.not.have.property('hidden');
      expect(inserted[0]).to.include({ totalFollowers: 2, sampledFollowers: 0 });
      expect(inserted[0].servers).to.deep.equal([]);
    });

    it('does not count the same page twice when the server repeats a cursor', async () => {
      followersCount = 4;
      pages = [
        { data: [{ acct: 'a' }, { acct: 'b' }], link: linkTo('100') },
        { data: [{ acct: 'c' }, { acct: 'd' }], link: linkTo('100') },
        { data: [{ acct: 'c' }, { acct: 'd' }], link: linkTo('100') },
      ];

      await run();

      expect(followerCalls).to.have.length(2);
      expect(inserted[0].sampledFollowers).to.equal(4);
    });

    it('does not store anything on unexpected errors', async () => {
      followersCount = 1;
      followersError = httpError(500);

      let caught: any;
      try {
        await run();
      } catch (error) {
        caught = error;
      }

      expect(caught?.message).to.equal('HTTP 500');
      expect(inserted).to.have.length(0);
    });

    it('skips accounts without credentials', async () => {
      credentials = null;

      const snapshot = await run();

      expect(snapshot).to.equal(null);
      expect(inserted).to.have.length(0);
      expect(warnings[0]).to.contain('Access token not found');
    });
  });

  describe('getRecentlyFetchedAccountIds', () => {
    it('returns accounts with a snapshot inside the refresh interval', async () => {
      const id = new ObjectId();
      const now = new Date('2026-10-14T00:00:00.000Z');
      let query: any;
      const mockDb: any = {
        collection: () => ({
          distinct: async (field: string, filter: any) => {
            expect(field).to.equal('account');
            query = filter;
            return [id];
          },
        }),
      };

      const result = await getRecentlyFetchedAccountIds(mockDb, now);

      expect(query).to.deep.equal({ fetchedAt: { $gt: new Date(now.getTime() - REFRESH_INTERVAL_MS) } });
      expect(result.has(id.toHexString())).to.equal(true);
    });
  });
});
