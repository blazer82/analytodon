import { Flags } from '@oclif/core';
import { Document, MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { encryptText, isEncrypted } from '../../helpers/encryption';

// Interface for the document structure we expect to insert into mastodon_apps
interface MastodonAppDocument extends Document {
  serverURL: string;
  clientID: string;
  clientSecret: string;
  appName: string;
  scopes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export default class MigrateAccountCredentialsToMastodonApps extends BaseCommand {
  static description =
    'Migrates account credentials to the mastodon_apps collection for unique server URLs. It uses the latest valid account (setupComplete=true, specific scopes) for each server to source clientID and clientSecret from its credentials, creating a new mastodon_app entry if one does not already exist for that serverURL.';

  static examples = [
    `$ <%= config.bin %> <%= command.id %>`,
    `$ <%= config.bin %> <%= command.id %> --dryRun`,
    `$ <%= config.bin %> <%= command.id %> --connectionString "mongodb://user:pass@host:port" --database "custom_db"`,
  ];

  static flags = {
    connectionString: Flags.string({
      char: 'c',
      description: 'MongoDB connection string.',
      default: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      required: false,
      env: 'MONGODB_URI',
    }),
    database: Flags.string({
      char: 'd',
      description: 'Source database name.',
      default: process.env.MONGODB_DATABASE || 'analytodon',
      required: false,
      env: 'MONGODB_DATABASE',
    }),
    dryRun: Flags.boolean({
      char: 'n',
      description: 'Perform a dry run without making changes to the database.',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(MigrateAccountCredentialsToMastodonApps);
    const { connectionString, database, dryRun } = flags;

    if (dryRun) {
      this.log('DRY RUN: No changes will be made to the database.');
    }
    this.log(`Starting migration of account credentials to mastodon_apps in database '${database}'...`);

    let client: MongoClient | undefined;

    try {
      // Ensure ENCRYPTION_KEY is available and valid by attempting a benign encryption.
      // encryptText(null) will call getKey() which validates the ENCRYPTION_KEY.
      try {
        encryptText(null); // This will throw if ENCRYPTION_KEY is not set or invalid
      } catch (e: any) {
        this.error(
          `Encryption key error: ${e.message}. Please ensure ENCRYPTION_KEY environment variable is correctly set.`,
          {
            exit: 1,
          },
        );
      }

      client = new MongoClient(connectionString);
      await client.connect();
      this.log('Successfully connected to MongoDB.');
      const db = client.db(database);
      const accountsCollection = db.collection('accounts');
      const accountCredentialsCollection = db.collection('accountcredentials');
      const mastodonAppsCollection = db.collection('mastodon_apps');

      this.log(`Identifying unique serverURLs from 'accounts' collection with required scopes...`);

      const requiredScopes = ['read:accounts', 'read:statuses', 'read:notifications'];

      const pipeline = [
        {
          $match: {
            setupComplete: true,
            requestedScope: { $all: requiredScopes },
          },
        },
        {
          $sort: { updatedAt: -1 as -1 }, // Get the most recently updated account for a serverURL
        },
        {
          $group: {
            _id: '$serverURL', // Group by serverURL to get unique servers
            latestAccountDoc: { $first: '$$ROOT' }, // Get the full document of the latest account
          },
        },
        {
          $replaceRoot: { newRoot: '$latestAccountDoc' }, // Make the account document the root for easier access
        },
      ];

      const accountsToProcessCursor = accountsCollection.aggregate(pipeline);

      let processedServerURLsCount = 0;
      let mastodonAppsCreatedCount = 0;
      let mastodonAppsSkippedExistingCount = 0;
      let errorsEncounteredCount = 0;

      for await (const accountDoc of accountsToProcessCursor) {
        processedServerURLsCount++;
        const serverURL = accountDoc.serverURL as string;
        const accountId = accountDoc._id as ObjectId;

        this.log(`Processing serverURL: ${serverURL} (from Account ID: ${accountId})`);

        const existingMastodonApp = await mastodonAppsCollection.findOne({ serverURL });
        if (existingMastodonApp) {
          this.log(
            `Mastodon app for serverURL ${serverURL} already exists (ID: ${existingMastodonApp._id}). Skipping.`,
          );
          mastodonAppsSkippedExistingCount++;
          continue;
        }

        // Fetch credentials using the accountId by querying the 'account' field in 'accountcredentials'
        const credentialDoc = await accountCredentialsCollection.findOne({ account: accountId });
        if (!credentialDoc) {
          this.warn(
            `Could not find AccountCredentials document for Account ID ${accountId} (serverURL: ${serverURL}). Cannot create Mastodon App.`,
          );
          errorsEncounteredCount++;
          continue;
        }

        const legacyClientID = credentialDoc.clientID as string | undefined;
        const legacyClientSecret = credentialDoc.clientSecret as string | undefined;

        if (!legacyClientID) {
          this.warn(
            `Account ID ${accountId} (serverURL: ${serverURL}): 'clientID' is missing in credentials document ${credentialDoc._id}. Cannot create Mastodon App.`,
          );
          errorsEncounteredCount++;
          continue;
        }

        if (!legacyClientSecret) {
          this.warn(
            `Account ID ${accountId} (serverURL: ${serverURL}): 'clientSecret' is missing in credentials document ${credentialDoc._id}. Cannot create Mastodon App.`,
          );
          errorsEncounteredCount++;
          continue;
        }

        let encryptedClientSecret: string | null = null;
        try {
          encryptedClientSecret = !isEncrypted(legacyClientSecret)
            ? encryptText(legacyClientSecret)
            : legacyClientSecret;
          if (!encryptedClientSecret) {
            // This case implies legacyClientSecret was empty or null, or encryptText had an internal issue not throwing.
            this.warn(
              `Encryption of 'legacyClientSecret' for serverURL ${serverURL} (Account ID ${accountId}) resulted in a null value. Cannot create Mastodon App.`,
            );
            errorsEncounteredCount++;
            continue;
          }
        } catch (encError: any) {
          // This catches errors from getKey() if ENCRYPTION_KEY is problematic during the encryptText call.
          this.warn(
            `Encryption failed for 'legacyClientSecret' for serverURL ${serverURL} (Account ID ${accountId}): ${encError.message}. Cannot create Mastodon App.`,
          );
          errorsEncounteredCount++;
          continue;
        }

        const newMastodonAppData: MastodonAppDocument = {
          serverURL,
          clientID: legacyClientID,
          clientSecret: encryptedClientSecret, // Now guaranteed to be a non-null string
          appName: 'Analytodon',
          scopes: accountDoc.requestedScope as string[], // Should match requiredScopes
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (!dryRun) {
          try {
            const insertResult = await mastodonAppsCollection.insertOne(newMastodonAppData);
            this.log(
              `Successfully created Mastodon App entry for serverURL ${serverURL} with new ID: ${insertResult.insertedId}.`,
            );
            mastodonAppsCreatedCount++;
          } catch (dbError: any) {
            this.error(
              `Failed to insert Mastodon App entry for serverURL ${serverURL} (Account ID ${accountId}): ${dbError.message}`,
              { exit: false }, // Continue processing other accounts
            );
            errorsEncounteredCount++;
          }
        } else {
          this.log(
            `DRY RUN: Would create Mastodon App entry for serverURL ${serverURL} (Account ID ${accountId}) with ClientID ${legacyClientID} and Scopes [${(
              accountDoc.requestedScope as string[]
            ).join(', ')}]. ClientSecret would be encrypted.`,
          );
          mastodonAppsCreatedCount++; // Count as if created for dry run summary
        }
      }

      this.log('Migration process finished.');
      this.log(
        `Summary: Iterated over ${processedServerURLsCount} unique serverURLs meeting criteria. ` +
          `${mastodonAppsCreatedCount} Mastodon App entries ${dryRun ? 'would have been' : 'were'} processed for creation. ` +
          `${mastodonAppsSkippedExistingCount} entries were skipped (already existed). ` +
          `${errorsEncounteredCount} errors or issues encountered preventing creation.`,
      );
    } catch (error: any) {
      // Catch critical errors (e.g., DB connection, initial encryption key check)
      this.error(`A critical error occurred: ${error.message}`, { exit: 1 });
      if (error.stack && !(error instanceof Error && error.message.includes('ENCRYPTION_KEY'))) {
        // Avoid double logging stack for known handled errors like ENCRYPTION_KEY
        this.logToStderr(error.stack);
      }
    } finally {
      if (client) {
        await client.close();
        this.log('Database connection closed.');
      }
    }
  }
}
