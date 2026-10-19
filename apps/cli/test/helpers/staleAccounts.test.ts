import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import {
  exceedsStaleRatio,
  findStaleAccounts,
  getStaleCutoff,
  selectStaleAccountsForNotice,
  StaleAccountRecord,
} from '../../src/helpers/staleAccounts';

const makeOwner = (overrides: Record<string, any> = {}) => ({
  _id: new ObjectId(),
  email: 'owner@example.com',
  isActive: true,
  emailVerified: true,
  role: 'account-owner',
  ...overrides,
});

const makeRecord = (owner: any, accountOverrides: Record<string, any> = {}): StaleAccountRecord => ({
  account: {
    _id: new ObjectId(),
    name: 'account',
    serverURL: 'https://mastodon.social',
    isActive: true,
    setupComplete: true,
    owner: owner._id,
    ...accountOverrides,
  },
  owner,
  lastStatsDate: new Date('2026-01-01T00:00:00.000Z'),
});

describe('staleAccounts helper', () => {
  describe('getStaleCutoff', () => {
    it('should return the date the given number of days before now', () => {
      const now = new Date('2026-03-10T12:00:00.000Z');
      expect(getStaleCutoff(3, now).toISOString()).to.equal('2026-03-07T12:00:00.000Z');
    });
  });

  describe('findStaleAccounts', () => {
    it('should combine accounts with outdated stats and accounts without stats', async () => {
      const owner = makeOwner();
      const withStatsAccount = { _id: new ObjectId(), name: 'with-stats', owner: owner._id };
      const noStatsAccount = { _id: new ObjectId(), name: 'no-stats', owner: owner._id };
      const lastStatsDate = new Date('2026-01-01T00:00:00.000Z');
      const pipelines: Record<string, any[]> = {};

      const mockDb: any = {
        collection: (name: string) => ({
          aggregate: (pipeline: any[]) => {
            pipelines[name] = pipeline;
            return {
              toArray: async () =>
                name === 'dailyaccountstats'
                  ? [{ _id: withStatsAccount._id, lastStatsDate, account: withStatsAccount, owner }]
                  : [{ ...noStatsAccount, ownerDoc: owner }],
            };
          },
        }),
      };

      const cutoff = new Date('2026-03-07T00:00:00.000Z');
      const result = await findStaleAccounts(mockDb, cutoff);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({ account: withStatsAccount, owner, lastStatsDate });
      expect(result[1]).to.deep.equal({ account: noStatsAccount, owner, lastStatsDate: null });

      // Both queries use the cutoff
      expect(pipelines.dailyaccountstats[1]).to.deep.equal({ $match: { lastStatsDate: { $lt: cutoff } } });
      expect(pipelines.accounts[0].$match.$or).to.deep.equal([{ createdAt: { $lt: cutoff } }, { createdAt: null }]);
      expect(pipelines.accounts[0].$match.isActive).to.equal(true);
      expect(pipelines.accounts[0].$match.setupComplete).to.equal(true);
    });
  });

  describe('selectStaleAccountsForNotice', () => {
    it('should group stale accounts by owner', () => {
      const owner1 = makeOwner();
      const owner2 = makeOwner();
      const records = [makeRecord(owner1), makeRecord(owner2), makeRecord(owner1)];

      const result = selectStaleAccountsForNotice(records);

      expect([...result.keys()]).to.deep.equal([owner1._id.toHexString(), owner2._id.toHexString()]);
      expect(result.get(owner1._id.toHexString())).to.deep.equal([
        records[0].account._id.toHexString(),
        records[2].account._id.toHexString(),
      ]);
      expect(result.get(owner2._id.toHexString())).to.deep.equal([records[1].account._id.toHexString()]);
    });

    it('should skip accounts that were already notified', () => {
      const owner = makeOwner();
      const records = [makeRecord(owner, { staleNoticeSentAt: new Date() }), makeRecord(owner)];

      const result = selectStaleAccountsForNotice(records);

      expect(result.get(owner._id.toHexString())).to.deep.equal([records[1].account._id.toHexString()]);
    });

    it('should skip owners that are all notified', () => {
      const owner = makeOwner();
      const result = selectStaleAccountsForNotice([makeRecord(owner, { staleNoticeSentAt: new Date() })]);
      expect(result.size).to.equal(0);
    });

    it('should skip inactive, unverified and non account-owner users', () => {
      const records = [
        makeRecord(makeOwner({ isActive: false })),
        makeRecord(makeOwner({ emailVerified: false })),
        makeRecord(makeOwner({ emailVerified: undefined })),
        makeRecord(makeOwner({ role: 'admin' })),
      ];

      expect(selectStaleAccountsForNotice(records).size).to.equal(0);
    });

    it('should only select accounts of the given user and skip owner checks', () => {
      const admin = makeOwner({ role: 'admin' });
      const other = makeOwner();
      const records = [makeRecord(admin), makeRecord(other), makeRecord(admin, { staleNoticeSentAt: new Date() })];

      const result = selectStaleAccountsForNotice(records, { userID: admin._id.toHexString() });

      expect([...result.keys()]).to.deep.equal([admin._id.toHexString()]);
      expect(result.get(admin._id.toHexString())).to.deep.equal([records[0].account._id.toHexString()]);
    });
  });

  describe('exceedsStaleRatio', () => {
    it('should not exceed when the ratio is below or equal to the maximum', () => {
      expect(exceedsStaleRatio(1, 10, 0.2)).to.equal(false);
      expect(exceedsStaleRatio(2, 10, 0.2)).to.equal(false);
      expect(exceedsStaleRatio(0, 0, 0.2)).to.equal(false);
    });

    it('should exceed when the ratio is above the maximum', () => {
      expect(exceedsStaleRatio(3, 10, 0.2)).to.equal(true);
      expect(exceedsStaleRatio(1, 0, 0.2)).to.equal(true);
    });
  });
});
