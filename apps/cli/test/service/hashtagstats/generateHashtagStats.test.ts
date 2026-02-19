import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { generateHashtagStats } from '../../../src/service/hashtagstats/generateHashtagStats';

describe('generateHashtagStats', () => {
  let mockAccount: any;
  let aggregateResults: any[];
  let upsertCalls: { filter: any; update: any; options: any }[];
  let aggregatePipeline: any[];
  let mockDb: any;

  beforeEach(() => {
    aggregateResults = [];
    upsertCalls = [];
    aggregatePipeline = [];

    mockAccount = {
      _id: new ObjectId(),
      name: 'Test Account',
      timezone: 'Europe/Berlin',
    };

    const mockCursor = {
      _index: 0,
      hasNext: async function () {
        return this._index < aggregateResults.length;
      },
      next: async function () {
        return aggregateResults[this._index++];
      },
    };

    const mockCollection = (name: string) => {
      if (name === 'toots') {
        return {
          aggregate: (pipeline: any[]) => {
            aggregatePipeline = pipeline;
            return mockCursor;
          },
        };
      }
      if (name === 'hashtagstats') {
        return {
          updateOne: async (filter: any, update: any, options: any) => {
            upsertCalls.push({ filter, update, options });
            return { modifiedCount: 1 };
          },
        };
      }
      return {};
    };

    mockDb = { collection: mockCollection };
  });

  it('should use default date filter (yesterday) when no options provided', async () => {
    await generateHashtagStats(mockDb, mockAccount);

    // Check that $match stage exists with createdAt filter
    const matchStage = aggregatePipeline[0].$match;
    expect(matchStage.account).to.deep.equal(mockAccount._id);
    expect(matchStage.tags).to.deep.equal({ $exists: true, $ne: [] });
    expect(matchStage.createdAt).to.have.property('$gte');
    expect(matchStage.createdAt.$gte).to.be.instanceOf(Date);
  });

  it('should use --since date filter when since option provided', async () => {
    const sinceDate = new Date('2024-06-01T00:00:00.000Z');
    await generateHashtagStats(mockDb, mockAccount, { since: sinceDate });

    const matchStage = aggregatePipeline[0].$match;
    expect(matchStage.createdAt.$gte).to.deep.equal(sinceDate);
  });

  it('should not include date filter in full mode', async () => {
    await generateHashtagStats(mockDb, mockAccount, { full: true });

    const matchStage = aggregatePipeline[0].$match;
    expect(matchStage).to.not.have.property('createdAt');
    expect(matchStage.tags).to.deep.equal({ $exists: true, $ne: [] });
  });

  it('should include $unwind stage for tags', async () => {
    await generateHashtagStats(mockDb, mockAccount, { full: true });

    expect(aggregatePipeline[1]).to.deep.equal({ $unwind: '$tags' });
  });

  it('should normalize tag names to lowercase', async () => {
    await generateHashtagStats(mockDb, mockAccount, { full: true });

    const addFieldsStage = aggregatePipeline[2].$addFields;
    expect(addFieldsStage.normalizedTag).to.deep.equal({ $toLower: '$tags.name' });
  });

  it('should group by day and hashtag', async () => {
    await generateHashtagStats(mockDb, mockAccount, { full: true });

    const groupStage = aggregatePipeline[3].$group;
    expect(groupStage._id).to.have.property('day');
    expect(groupStage._id).to.have.property('hashtag', '$normalizedTag');
    expect(groupStage.tootCount).to.deep.equal({ $sum: 1 });
    expect(groupStage.repliesCount).to.deep.equal({ $sum: '$repliesCount' });
    expect(groupStage.reblogsCount).to.deep.equal({ $sum: '$reblogsCount' });
    expect(groupStage.favouritesCount).to.deep.equal({ $sum: '$favouritesCount' });
  });

  it('should upsert results into hashtagstats collection', async () => {
    const day = new Date('2024-01-15T00:00:00.000Z');
    aggregateResults = [
      {
        _id: { day, hashtag: 'typescript' },
        tootCount: 5,
        repliesCount: 10,
        reblogsCount: 20,
        favouritesCount: 30,
      },
    ];

    await generateHashtagStats(mockDb, mockAccount, { full: true });

    expect(upsertCalls).to.have.lengthOf(1);
    expect(upsertCalls[0].filter).to.deep.equal({
      account: mockAccount._id,
      day,
      hashtag: 'typescript',
    });
    expect(upsertCalls[0].update.$set).to.deep.include({
      tootCount: 5,
      repliesCount: 10,
      reblogsCount: 20,
      favouritesCount: 30,
    });
    expect(upsertCalls[0].options).to.deep.equal({ upsert: true });
  });

  it('should handle multiple results', async () => {
    aggregateResults = [
      {
        _id: { day: new Date('2024-01-15'), hashtag: 'typescript' },
        tootCount: 5,
        repliesCount: 10,
        reblogsCount: 20,
        favouritesCount: 30,
      },
      {
        _id: { day: new Date('2024-01-15'), hashtag: 'rust' },
        tootCount: 3,
        repliesCount: 5,
        reblogsCount: 8,
        favouritesCount: 12,
      },
    ];

    await generateHashtagStats(mockDb, mockAccount, { full: true });

    expect(upsertCalls).to.have.lengthOf(2);
    expect(upsertCalls[0].filter.hashtag).to.equal('typescript');
    expect(upsertCalls[1].filter.hashtag).to.equal('rust');
  });

  it('should handle empty results', async () => {
    aggregateResults = [];
    await generateHashtagStats(mockDb, mockAccount, { full: true });
    expect(upsertCalls).to.have.lengthOf(0);
  });

  it('should use correct timezone in pipeline', async () => {
    mockAccount.timezone = 'America/New_York';
    await generateHashtagStats(mockDb, mockAccount, { full: true });

    const addFieldsStage = aggregatePipeline[2].$addFields;
    expect(addFieldsStage.day.$dateToString.timezone).to.equal('America/New_York');
  });
});
