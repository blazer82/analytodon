import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient } from 'mongodb';

import { BaseCommand } from '../../base';
import { trackJobRun } from '../../helpers/trackJobRun';

export default class RefreshTokens extends BaseCommand {
  static description = 'Clean up expired refresh tokens.';

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
    const { flags } = await this.parse(RefreshTokens);

    this.log('Clean up refresh tokens: Started');

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'cleanup:refreshtokens', logger: this }, async () => {
        const now = new Date();
        const query: Filter<Document> = {
          expiresAt: { $lt: now },
        };

        const collection = db.collection('refreshtokens');
        let count = 0;

        if (flags.dryRun) {
          count = await collection.countDocuments(query);
          this.log(`Clean up refresh tokens: ${count} expired tokens would be removed (DRY RUN).`);
        } else {
          const { deletedCount } = await collection.deleteMany(query);
          count = deletedCount;
          this.log(`Clean up refresh tokens: Removed ${deletedCount} expired tokens.`);
        }

        this.log('Clean up refresh tokens: Done');
        return { recordsProcessed: count };
      });
    } finally {
      await connection.close();
    }
  }
}
