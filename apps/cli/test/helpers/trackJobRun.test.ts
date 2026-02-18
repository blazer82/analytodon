import { expect } from 'chai';

import { trackJobRun } from '../../src/helpers/trackJobRun';

describe('trackJobRun', () => {
  let insertedDoc: any;
  let updatedFilter: any;
  let updatedDoc: any;
  let mockCollection: any;
  let mockDb: any;
  let mockLogger: any;
  let logMessages: string[];
  let errorMessages: (string | Error)[];

  beforeEach(() => {
    insertedDoc = null;
    updatedFilter = null;
    updatedDoc = null;
    logMessages = [];
    errorMessages = [];

    mockCollection = {
      insertOne: async (doc: any) => {
        insertedDoc = doc;
        return { insertedId: doc._id };
      },
      updateOne: async (filter: any, update: any) => {
        updatedFilter = filter;
        updatedDoc = update;
        return { modifiedCount: 1 };
      },
    };

    mockDb = {
      collection: (name: string) => {
        expect(name).to.equal('cli_job_runs');
        return mockCollection;
      },
    };

    mockLogger = {
      log: (message?: string) => {
        if (message) logMessages.push(message);
      },
      logError: (input: string | Error) => {
        errorMessages.push(input);
      },
    };
  });

  it('should insert a running document at start', async () => {
    await trackJobRun({ db: mockDb, jobName: 'test:job', logger: mockLogger }, async () => {});

    expect(insertedDoc).to.not.equal(null);
    expect(insertedDoc.jobName).to.equal('test:job');
    expect(insertedDoc.status).to.equal('running');
    expect(insertedDoc.startedAt).to.be.instanceOf(Date);
    expect(insertedDoc.completedAt).to.equal(null);
    expect(insertedDoc.durationMs).to.equal(null);
    expect(insertedDoc.errorMessage).to.equal(null);
  });

  it('should update to success on successful completion', async () => {
    await trackJobRun({ db: mockDb, jobName: 'test:job', logger: mockLogger }, async () => {
      return { recordsProcessed: 42 };
    });

    expect(updatedFilter._id).to.deep.equal(insertedDoc._id);
    expect(updatedDoc.$set.status).to.equal('success');
    expect(updatedDoc.$set.completedAt).to.be.instanceOf(Date);
    expect(updatedDoc.$set.durationMs).to.be.a('number');
    expect(updatedDoc.$set.durationMs).to.be.at.least(0);
    expect(updatedDoc.$set.recordsProcessed).to.equal(42);
  });

  it('should update to failure and re-throw on error', async () => {
    const testError = new Error('test failure');

    try {
      await trackJobRun({ db: mockDb, jobName: 'test:job', logger: mockLogger }, async () => {
        throw testError;
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).to.equal(testError);
    }

    expect(updatedDoc.$set.status).to.equal('failure');
    expect(updatedDoc.$set.errorMessage).to.equal('test failure');
    expect(updatedDoc.$set.completedAt).to.be.instanceOf(Date);
    expect(updatedDoc.$set.durationMs).to.be.a('number');
  });

  it('should compute durationMs correctly', async () => {
    const startTime = Date.now();

    await trackJobRun({ db: mockDb, jobName: 'test:job', logger: mockLogger }, async () => {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const durationMs = updatedDoc.$set.durationMs;
    expect(durationMs).to.be.at.least(40); // Allow some tolerance
    expect(durationMs).to.be.at.most(Date.now() - startTime + 100);
  });

  it('should set recordsProcessed to null when not returned', async () => {
    await trackJobRun({ db: mockDb, jobName: 'test:job', logger: mockLogger }, async () => {});

    expect(updatedDoc.$set.recordsProcessed).to.equal(null);
  });
});
