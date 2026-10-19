import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import {
  sendStaleAccountNotices,
  StaleAccountNoticePayload,
} from '../../../src/service/staleaccounts/sendStaleAccountNotices';

describe('sendStaleAccountNotices', () => {
  let staleWithStats: any[];
  let staleWithoutStats: any[];
  let activeCount: number;
  let countQuery: any;
  let notifiedAccounts: any[];
  let findQuery: any;
  let updateManyCalls: { filter: any; update: any }[];
  let sent: StaleAccountNoticePayload[];
  let errors: (string | Error)[];
  let mockDb: any;
  let logger: any;

  const owner1 = { _id: new ObjectId(), isActive: true, emailVerified: true, role: 'account-owner' };
  const owner2 = { _id: new ObjectId(), isActive: true, emailVerified: true, role: 'account-owner' };
  const account1 = { _id: new ObjectId(), owner: owner1._id };
  const account2 = { _id: new ObjectId(), owner: owner1._id };
  const account3 = { _id: new ObjectId(), owner: owner2._id };

  const sendNotice = async (payload: StaleAccountNoticePayload) => {
    sent.push(payload);
  };

  beforeEach(() => {
    staleWithStats = [
      { _id: account1._id, lastStatsDate: new Date('2026-01-01'), account: account1, owner: owner1 },
      { _id: account3._id, lastStatsDate: new Date('2026-01-02'), account: account3, owner: owner2 },
    ];
    staleWithoutStats = [{ ...account2, ownerDoc: owner1 }];
    activeCount = 100;
    countQuery = null;
    notifiedAccounts = [];
    findQuery = null;
    updateManyCalls = [];
    sent = [];
    errors = [];

    mockDb = {
      collection: (name: string) => ({
        aggregate: () => ({
          toArray: async () => (name === 'dailyaccountstats' ? staleWithStats : staleWithoutStats),
        }),
        countDocuments: async (query: any) => {
          expect(name).to.equal('accounts');
          countQuery = query;
          return activeCount;
        },
        find: (query: any) => {
          expect(name).to.equal('accounts');
          findQuery = query;
          return { project: () => ({ toArray: async () => notifiedAccounts }) };
        },
        updateMany: async (filter: any, update: any) => {
          expect(name).to.equal('accounts');
          updateManyCalls.push({ filter, update });
          return { modifiedCount: notifiedAccounts.length };
        },
      }),
    };

    logger = {
      log: () => {},
      logError: (input: string | Error) => errors.push(input),
    };
  });

  it('should send one notice per owner listing all affected accounts', async () => {
    const result = await sendStaleAccountNotices(mockDb, {
      days: 3,
      maxStaleRatio: 0.2,
      dryRun: false,
      sendNotice,
      logger,
    });

    expect(countQuery).to.deep.equal({ isActive: true, setupComplete: true });
    expect(sent).to.deep.equal([
      { userID: owner1._id.toHexString(), accountIDs: [account1._id.toHexString(), account2._id.toHexString()] },
      { userID: owner2._id.toHexString(), accountIDs: [account3._id.toHexString()] },
    ]);
    expect(result.recordsProcessed).to.equal(2);
    expect(errors).to.have.length(0);
  });

  it('should not send anything in dry run mode', async () => {
    const result = await sendStaleAccountNotices(mockDb, {
      days: 3,
      maxStaleRatio: 0.2,
      dryRun: true,
      sendNotice,
      logger,
    });

    expect(sent).to.have.length(0);
    expect(result.recordsProcessed).to.equal(2);
  });

  it('should only process the given user', async () => {
    await sendStaleAccountNotices(mockDb, {
      days: 3,
      maxStaleRatio: 0.2,
      userID: owner2._id.toHexString(),
      dryRun: false,
      sendNotice,
      logger,
    });

    expect(sent).to.deep.equal([{ userID: owner2._id.toHexString(), accountIDs: [account3._id.toHexString()] }]);
  });

  it('should send nothing and throw when the stale ratio exceeds the maximum', async () => {
    activeCount = 10; // 3 of 10 stale = 0.3

    let thrown: any;
    try {
      await sendStaleAccountNotices(mockDb, {
        days: 3,
        maxStaleRatio: 0.2,
        dryRun: false,
        sendNotice,
        logger,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(Error);
    expect(thrown.message).to.contain('exceeds the maximum ratio of 0.2');
    expect(sent).to.have.length(0);
    expect(errors).to.have.length(1);
  });

  it('should not count already notified stale accounts towards the stale ratio', async () => {
    // 3 stale of 10 active, but 2 of them were already notified: 1 newly stale of 8 = 0.125
    activeCount = 10;
    staleWithStats = staleWithStats.map((doc) => ({
      ...doc,
      account: { ...doc.account, staleNoticeSentAt: new Date() },
    }));

    await sendStaleAccountNotices(mockDb, { days: 3, maxStaleRatio: 0.2, dryRun: false, sendNotice, logger });

    expect(sent).to.deep.equal([{ userID: owner1._id.toHexString(), accountIDs: [account2._id.toHexString()] }]);
    expect(errors).to.have.length(0);
  });

  it('should log the selection but not throw or send in dry run mode when the ratio is exceeded', async () => {
    activeCount = 10;
    const logs: string[] = [];
    logger.log = (message: string) => logs.push(message);

    const result = await sendStaleAccountNotices(mockDb, {
      days: 3,
      maxStaleRatio: 0.2,
      dryRun: true,
      sendNotice,
      logger,
    });

    expect(errors).to.have.length(1);
    expect(sent).to.have.length(0);
    expect(result.recordsProcessed).to.equal(2);
    expect(logs.some((message) => message.includes(owner1._id.toHexString()) && message.includes('DRY RUN'))).to.equal(
      true,
    );
  });

  it('should reset the notice flag of accounts that are no longer stale', async () => {
    const recovered = { _id: new ObjectId() };
    notifiedAccounts = [recovered];

    await sendStaleAccountNotices(mockDb, { days: 3, maxStaleRatio: 0.2, dryRun: false, sendNotice, logger });

    expect(findQuery.staleNoticeSentAt).to.deep.equal({ $ne: null });
    expect(findQuery._id.$nin.map((id: ObjectId) => id.toHexString())).to.have.members([
      account1._id.toHexString(),
      account2._id.toHexString(),
      account3._id.toHexString(),
    ]);
    expect(updateManyCalls).to.deep.equal([
      { filter: { _id: { $in: [recovered._id] } }, update: { $unset: { staleNoticeSentAt: '' } } },
    ]);
  });

  it('should not reset notice flags in dry run mode', async () => {
    notifiedAccounts = [{ _id: new ObjectId() }];

    await sendStaleAccountNotices(mockDb, { days: 3, maxStaleRatio: 0.2, dryRun: true, sendNotice, logger });

    expect(updateManyCalls).to.have.length(0);
  });

  it('should only reset notice flags of the given user', async () => {
    await sendStaleAccountNotices(mockDb, {
      days: 3,
      maxStaleRatio: 0.2,
      userID: owner2._id.toHexString(),
      dryRun: false,
      sendNotice,
      logger,
    });

    expect(findQuery.owner.toHexString()).to.equal(owner2._id.toHexString());
    expect(updateManyCalls).to.have.length(0);
  });

  it('should throw when every notice fails to send', async () => {
    let thrown: any;
    try {
      await sendStaleAccountNotices(mockDb, {
        days: 3,
        maxStaleRatio: 0.2,
        dryRun: false,
        sendNotice: async () => {
          throw new Error('Request failed');
        },
        logger,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(Error);
    expect(thrown.message).to.contain('Failed to send all 2 notices');
    expect(errors).to.have.length(2);
  });

  it('should send when the stale ratio equals the maximum', async () => {
    activeCount = 15; // 3 of 15 stale = 0.2

    await sendStaleAccountNotices(mockDb, { days: 3, maxStaleRatio: 0.2, dryRun: false, sendNotice, logger });

    expect(sent).to.have.length(2);
  });

  it('should continue with other users when sending fails for one', async () => {
    let calls = 0;
    const result = await sendStaleAccountNotices(mockDb, {
      days: 3,
      maxStaleRatio: 0.2,
      dryRun: false,
      sendNotice: async (payload) => {
        calls++;
        if (payload.userID === owner1._id.toHexString()) {
          throw new Error('Request failed');
        }
        sent.push(payload);
      },
      logger,
    });

    expect(calls).to.equal(2);
    expect(sent).to.deep.equal([{ userID: owner2._id.toHexString(), accountIDs: [account3._id.toHexString()] }]);
    expect(result.recordsProcessed).to.equal(1);
    expect(errors).to.have.length(1);
  });
});
