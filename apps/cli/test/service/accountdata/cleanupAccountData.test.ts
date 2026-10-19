import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { ACCOUNT_DATA_COLLECTIONS, cleanupAccountData } from '../../../src/service/accountdata/cleanupAccountData';

describe('cleanupAccountData', () => {
  const accountIds = [new ObjectId(), new ObjectId()];

  let existingAccounts: { _id: ObjectId }[];
  let deleteCalls: { collection: string; filter: any }[];
  let countCalls: { collection: string; filter: any }[];
  let logMessages: string[];
  let warnings: string[];
  let mockDb: any;
  let mockLogger: any;

  beforeEach(() => {
    existingAccounts = accountIds.map((_id) => ({ _id }));
    deleteCalls = [];
    countCalls = [];
    logMessages = [];
    warnings = [];

    mockDb = {
      collection: (name: string) => {
        if (name === 'accounts') {
          return {
            find: (filter: any, options: any) => {
              expect(filter).to.deep.equal({});
              expect(options).to.deep.equal({ projection: { _id: 1 } });
              return { toArray: async () => existingAccounts };
            },
          };
        }

        return {
          deleteMany: async (filter: any) => {
            deleteCalls.push({ collection: name, filter });
            return { deletedCount: 2 };
          },
          countDocuments: async (filter: any) => {
            countCalls.push({ collection: name, filter });
            return 3;
          },
        };
      },
    };

    mockLogger = {
      log: (message: string) => logMessages.push(message),
      logWarning: (message: string) => warnings.push(message),
    };
  });

  it('includes all collections holding account data', () => {
    expect(ACCOUNT_DATA_COLLECTIONS).to.have.members([
      'accountcredentials',
      'accountstats',
      'dailyaccountstats',
      'dailytootstats',
      'followerserversnapshots',
      'hashtagstats',
      'toots',
      'tootstats',
    ]);
  });

  it('removes data of deleted accounts from every collection', async () => {
    const total = await cleanupAccountData(mockDb, { dryRun: false, logger: mockLogger });

    expect(deleteCalls.map(({ collection }) => collection)).to.deep.equal(ACCOUNT_DATA_COLLECTIONS);
    for (const { filter } of deleteCalls) {
      expect(filter).to.deep.equal({ account: { $nin: accountIds } });
    }
    expect(countCalls).to.have.length(0);
    expect(total).to.equal(2 * ACCOUNT_DATA_COLLECTIONS.length);
    expect(logMessages).to.include('Clean up account data: Removed 2 hashtagstats');
    expect(logMessages).to.include('Clean up account data: Done');
    expect(warnings).to.have.length(0);
  });

  it('removes hashtag stats of deleted accounts', async () => {
    await cleanupAccountData(mockDb, { dryRun: false, logger: mockLogger });

    const hashtagStatsCall = deleteCalls.find(({ collection }) => collection === 'hashtagstats');
    expect(hashtagStatsCall).to.not.equal(undefined);
    expect(hashtagStatsCall!.filter).to.deep.equal({ account: { $nin: accountIds } });
  });

  it('only counts documents in a dry run', async () => {
    const total = await cleanupAccountData(mockDb, { dryRun: true, logger: mockLogger });

    expect(deleteCalls).to.have.length(0);
    expect(countCalls.map(({ collection }) => collection)).to.deep.equal(ACCOUNT_DATA_COLLECTIONS);
    for (const { filter } of countCalls) {
      expect(filter).to.deep.equal({ account: { $nin: accountIds } });
    }
    expect(total).to.equal(3 * ACCOUNT_DATA_COLLECTIONS.length);
    expect(logMessages).to.include('Clean up account data: Removed 3 hashtagstats (DRY RUN)');
  });

  it('makes no changes when no accounts exist', async () => {
    existingAccounts = [];

    const total = await cleanupAccountData(mockDb, { dryRun: false, logger: mockLogger });

    expect(total).to.equal(0);
    expect(deleteCalls).to.have.length(0);
    expect(countCalls).to.have.length(0);
    expect(warnings).to.deep.equal(['Clean up account data: Something went wrong, no changes made.']);
  });
});
