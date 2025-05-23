import { Flags } from '@oclif/core';
import { Document, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { encryptText, isEncrypted } from '../../helpers/encryption';

export default class EncryptAccountCredentials extends BaseCommand {
  static description = 'Encrypts unencrypted accessTokens and clientSecrets in the accountcredentials collection.';

  static examples = [`$ <%= config.bin %> <%= command.id %>`, `$ <%= config.bin %> <%= command.id %> --dryRun`];

  static flags = {
    connectionString: Flags.string({
      char: 'c',
      description: 'MongoDB connection string',
      default: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      required: false,
    }),
    database: Flags.string({
      char: 'd',
      description: 'Source database name',
      default: process.env.MONGODB_DATABASE || 'analytodon',
      required: false,
    }),
    dryRun: Flags.boolean({
      char: 'n',
      description: 'Perform a dry run without making changes to the database.',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(EncryptAccountCredentials);
    const { connectionString, database, dryRun } = flags;

    if (dryRun) {
      this.log('DRY RUN: No changes will be made to the database.');
    }
    this.log(`Starting encryption process for accountcredentials in database '${database}'...`);

    let client: MongoClient | undefined;

    try {
      // The first call to encryptText will trigger key initialization and throw if ENCRYPTION_KEY is invalid.
      // We can test it here explicitly if needed, but letting it happen naturally is also fine.

      client = new MongoClient(connectionString);
      await client.connect();
      this.log('Successfully connected to MongoDB.');
      const db = client.db(database);
      const collection = db.collection('accountcredentials');

      const cursor = collection.find();
      this.log(`Processing documents from 'accountcredentials' collection...`);

      let updatedCount = 0;
      let checkedCount = 0;
      let errorsEncountered = 0;

      for await (const doc of cursor) {
        checkedCount++;
        const updates: Document = {};
        let needsDatabaseUpdate = false;

        // Check accessToken
        if (doc.accessToken && typeof doc.accessToken === 'string') {
          if (!isEncrypted(doc.accessToken)) {
            this.log(`Credential ID ${doc._id}: accessToken is unencrypted. Attempting encryption...`);
            const encryptedToken = encryptText(doc.accessToken);
            if (encryptedToken) {
              updates.accessToken = encryptedToken;
              needsDatabaseUpdate = true;
              this.log(`Credential ID ${doc._id}: accessToken successfully prepared for encryption.`);
            } else {
              this.warn(`Credential ID ${doc._id}: Failed to encrypt accessToken. Skipping this field.`);
              errorsEncountered++;
            }
          }
        }

        // Check clientSecret
        if (doc.clientSecret && typeof doc.clientSecret === 'string') {
          if (!isEncrypted(doc.clientSecret)) {
            this.log(`Credential ID ${doc._id}: clientSecret is unencrypted. Attempting encryption...`);
            const encryptedSecret = encryptText(doc.clientSecret);
            if (encryptedSecret) {
              updates.clientSecret = encryptedSecret;
              needsDatabaseUpdate = true;
              this.log(`Credential ID ${doc._id}: clientSecret successfully prepared for encryption.`);
            } else {
              this.warn(`Credential ID ${doc._id}: Failed to encrypt clientSecret. Skipping this field.`);
              errorsEncountered++;
            }
          }
        }

        if (needsDatabaseUpdate && Object.keys(updates).length > 0) {
          if (!dryRun) {
            try {
              const result = await collection.updateOne({ _id: doc._id as ObjectId }, { $set: updates });
              if (result.modifiedCount > 0) {
                this.log(`Credential ID ${doc._id}: Successfully updated with encrypted values.`);
                updatedCount++;
              } else if (result.matchedCount > 0 && result.modifiedCount === 0) {
                this.warn(
                  `Credential ID ${doc._id}: Document matched but was not modified. This might mean the data was already in the target state or an issue occurred.`,
                );
              } else {
                this.warn(`Credential ID ${doc._id}: Update operation did not find or modify the document.`);
              }
            } catch (dbError: any) {
              this.error(`Credential ID ${doc._id}: Failed to update document in database: ${dbError.message}`, {
                exit: false,
              });
              errorsEncountered++;
            }
          } else {
            this.log(`DRY RUN: Credential ID ${doc._id}: Would update with: ${JSON.stringify(updates)}`);
            updatedCount++; // Count as if updated for dry run summary
          }
        }
      }

      this.log('Encryption process finished.');
      this.log(
        `Summary: Processed ${checkedCount} documents. ${updatedCount} documents ${
          dryRun ? 'would have been' : 'were'
        } updated. ${errorsEncountered} errors encountered during encryption attempts or updates.`,
      );
    } catch (error: any) {
      this.error(`A critical error occurred: ${error.message}`, { exit: 1 });
      if (error.stack) {
        // Oclif's error logging might already show stack for unhandled rejections.
        // this.logToStderr(error.stack); // Use if more detailed stack trace is needed.
      }
    } finally {
      if (client) {
        await client.close();
        this.log('Database connection closed.');
      }
    }
  }
}
