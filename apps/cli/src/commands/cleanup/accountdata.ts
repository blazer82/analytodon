import { Flags } from '@oclif/core';
import { MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';
import { cleanupAccountData } from '../../service/accountdata/cleanupAccountData';

export default class Accountdata extends BaseCommand {
  static description = 'Clean up orphaned account data.';

  static examples = [`<%= config.bin %> <%= command.id %>`];

  static flags = {
    connectionString: Flags.string({
      char: 'c',
      description: 'MongoDB connection string',
      default: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    }),
    database: Flags.string({
      char: 'd',
      description: 'Source database name',
      default: process.env.MONGODB_DATABASE || 'analytodon',
    }),
    dryRun: Flags.boolean({
      char: 'x',
      description: 'Dry run, no actual changes made',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(Accountdata);

    this.log('Clean up account data: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'cleanup:accountdata', logger: this }, async () => {
        const recordsProcessed = await cleanupAccountData(db, { dryRun: flags.dryRun, logger: this });
        return { recordsProcessed };
      });
    } finally {
      await connection.close();
    }
  }
}
