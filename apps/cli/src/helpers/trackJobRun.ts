import { Db, ObjectId } from 'mongodb';

interface TrackJobRunLogger {
  log(message?: string, ...args: any[]): void;
  logError(input: string | Error): void;
}

interface TrackJobRunOptions {
  db: Db;
  jobName: string;
  logger: TrackJobRunLogger;
}

interface TrackJobRunResult {
  recordsProcessed?: number;
}

export async function trackJobRun(
  options: TrackJobRunOptions,
  fn: () => Promise<TrackJobRunResult | void>,
): Promise<void> {
  const { db, jobName, logger } = options;
  const collection = db.collection('cli_job_runs');
  const startedAt = new Date();

  const { insertedId } = await collection.insertOne({
    _id: new ObjectId(),
    jobName,
    startedAt,
    completedAt: null,
    status: 'running',
    durationMs: null,
    recordsProcessed: null,
    errorMessage: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  logger.log(`Job tracking: ${jobName} started (runId: ${insertedId})`);

  try {
    const result = await fn();
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await collection.updateOne(
      { _id: insertedId },
      {
        $set: {
          completedAt,
          status: 'success',
          durationMs,
          recordsProcessed: result?.recordsProcessed ?? null,
          updatedAt: completedAt,
        },
      },
    );

    logger.log(`Job tracking: ${jobName} completed successfully (${durationMs}ms)`);
  } catch (error: any) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = error?.message || String(error);

    await collection.updateOne(
      { _id: insertedId },
      {
        $set: {
          completedAt,
          status: 'failure',
          durationMs,
          errorMessage,
          updatedAt: completedAt,
        },
      },
    );

    logger.logError(`Job tracking: ${jobName} failed (${durationMs}ms): ${errorMessage}`);
    throw error;
  }
}
