import { Flags } from '@oclif/core';
import { Document, Filter, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { processInBatches } from '../../helpers/processInBatches';

const BATCH_SIZE = 5;

export default class Users extends BaseCommand {
  static description = "Clean up users that haven't completed setup.";

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
    const { flags } = await this.parse(Users);

    this.log('Clean up users: Started');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // Connect to database
    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    // Get all distinct owner IDs from the accounts collection that are valid ObjectIds
    const activeAccountOwnerIds = (
      await db.collection('accounts').distinct('owner', { owner: { $exists: true, $ne: null } })
    )
      .filter((id) => ObjectId.isValid(id as string | ObjectId)) // Filter out invalid representations if any
      .map((id) => new ObjectId(id as string | ObjectId)); // Ensure they are ObjectId instances

    const usersQuery: Filter<Document> = {
      _id: { $nin: activeAccountOwnerIds }, // User's _id is not in the list of owners from accounts
      role: 'account-owner',
      createdAt: { $lt: cutoffDate },
    };

    const userList = await db
      .collection('users')
      .find(usersQuery, { projection: { _id: 1 } })
      .toArray();

    this.log(`Clean up users: ${userList.length} users to clean up.`);

    await processInBatches(BATCH_SIZE, userList, async (user) => {
      this.log(`Clean up users: Remove user ${user._id}${flags.dryRun ? ' (DRY RUN)' : ''}`);
      if (!flags.dryRun) {
        await db.collection('users').deleteOne({ _id: user._id });
        await db.collection('usercredentials').deleteOne({ user: user._id });
      }
    });

    this.log('Clean up users: Done');

    await connection.close();
  }
}
