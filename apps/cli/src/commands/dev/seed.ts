import { Flags } from '@oclif/core';
import { MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { encryptText } from '../../helpers/encryption';
import { trackJobRun } from '../../helpers/trackJobRun';

const SEED_EMAILS = ['dev@analytodon.local', 'admin@analytodon.local'];
const SEED_SERVER_URL = 'https://mastodon.seed.local';

// bcrypt hash of 'password' with 10 salt rounds
const PASSWORD_HASH = '$2b$10$PLnLizmd6PbXr4xjh4A9IuLcCQjcilPnnT9K7VgcnRHbSCmjACABm';

const HASHTAGS = [
  'mastodon',
  'fediverse',
  'analytics',
  'opensource',
  'indieweb',
  'tech',
  'dataviz',
  'socialmedia',
  'privacy',
  'decentralized',
];

const TOOT_TEMPLATES = [
  'Just published my latest analysis of Fediverse growth trends!',
  'The community continues to grow. Here are the numbers.',
  'Interesting patterns in engagement this week.',
  'Exploring new ways to visualize social media data.',
  'Decentralized platforms are the future of online communication.',
  'Another day, another insight from the analytics dashboard.',
  'Open source tools make everything better.',
  'Privacy-first social media is not just a dream anymore.',
  'Weekly stats are in — exciting growth across the board!',
  'Building in public: here is what I learned this week.',
  'The Fediverse keeps surprising me with its creativity.',
  'Data-driven decisions start with good analytics.',
  'Self-hosting gives you control over your own data.',
  'Community-driven development at its finest.',
  'New feature alert: hashtag analytics are now live!',
];

export default class Seed extends BaseCommand {
  static description = 'Seed the development database with realistic test data';

  static examples = ['<%= config.bin %> <%= command.id %>', '<%= config.bin %> <%= command.id %> --reset'];

  static flags = {
    connectionString: Flags.string({
      char: 'c',
      description: 'MongoDB connection string',
      default: process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/analytodon_dev?authSource=admin',
    }),
    database: Flags.string({
      char: 'd',
      description: 'Database name',
      default: process.env.MONGODB_DATABASE || 'analytodon_dev',
    }),
    reset: Flags.boolean({
      char: 'r',
      description: 'Delete existing seed data before seeding',
      default: false,
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = await this.parse(Seed);

    this.log('Dev seed: Starting');

    const connection = await new MongoClient(flags.connectionString).connect();
    const db = connection.db(flags.database);

    try {
      await trackJobRun({ db, jobName: 'dev:seed', logger: this }, async () => {
        const existingUser = await db.collection('users').findOne({ email: SEED_EMAILS[0] });

        if (existingUser && !flags.reset) {
          this.log('Dev seed: Seed data already exists. Use --reset to re-seed.');
          return { recordsProcessed: 0 };
        }

        if (existingUser) {
          this.log('Dev seed: Resetting existing seed data...');
          await this.deleteSeedData(db);
        }

        const recordsProcessed = await this.createSeedData(db);

        this.log(`Dev seed: Complete. Created ${recordsProcessed} records.`);
        this.log('Dev seed: Login credentials:');
        this.log('  dev@analytodon.local / password (account-owner)');
        this.log('  admin@analytodon.local / password (admin)');

        return { recordsProcessed };
      });
    } finally {
      await connection.close();
    }
  }

  private async deleteSeedData(db: ReturnType<MongoClient['db']>): Promise<void> {
    const users = await db
      .collection('users')
      .find({ email: { $in: SEED_EMAILS } })
      .toArray();
    const userIds = users.map((u) => u._id);

    const accounts = await db
      .collection('accounts')
      .find({ owner: { $in: userIds } })
      .toArray();
    const accountIds = accounts.map((a) => a._id);

    if (accountIds.length > 0) {
      await db.collection('hashtagstats').deleteMany({ account: { $in: accountIds } });
      await db.collection('dailytootstats').deleteMany({ account: { $in: accountIds } });
      await db.collection('dailyaccountstats').deleteMany({ account: { $in: accountIds } });
      await db.collection('toots').deleteMany({ account: { $in: accountIds } });
      await db.collection('accountcredentials').deleteMany({ account: { $in: accountIds } });
    }

    if (userIds.length > 0) {
      await db.collection('accounts').deleteMany({ owner: { $in: userIds } });
      await db.collection('usercredentials').deleteMany({ user: { $in: userIds } });
      await db.collection('refreshtokens').deleteMany({ user: { $in: userIds } });
      await db.collection('users').deleteMany({ _id: { $in: userIds } });
    }

    await db.collection('mastodon_apps').deleteMany({ serverURL: SEED_SERVER_URL });

    this.log('Dev seed: Existing seed data deleted.');
  }

  private async createSeedData(db: ReturnType<MongoClient['db']>): Promise<number> {
    const now = new Date();
    let totalRecords = 0;

    // Create users
    const devUserId = new ObjectId();
    const adminUserId = new ObjectId();

    await db.collection('users').insertMany([
      {
        _id: devUserId,
        email: 'dev@analytodon.local',
        emailVerified: true,
        role: 'account-owner',
        isActive: true,
        timezone: 'Europe/Berlin',
        locale: 'en',
        maxAccounts: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: adminUserId,
        email: 'admin@analytodon.local',
        emailVerified: true,
        role: 'admin',
        isActive: true,
        timezone: 'Europe/Berlin',
        locale: 'en',
        createdAt: now,
        updatedAt: now,
      },
    ]);
    totalRecords += 2;

    // Create user credentials
    await db.collection('usercredentials').insertMany([
      {
        _id: new ObjectId(),
        user: devUserId,
        passwordHash: PASSWORD_HASH,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: new ObjectId(),
        user: adminUserId,
        passwordHash: PASSWORD_HASH,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    totalRecords += 2;

    // Create mastodon app
    await db.collection('mastodon_apps').insertOne({
      _id: new ObjectId(),
      serverURL: SEED_SERVER_URL,
      clientID: 'seed-client-id',
      clientSecret: 'seed-client-secret',
      appName: 'Analytodon',
      scopes: ['read'],
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    // Create account
    const accountId = new ObjectId();

    await db.collection('accounts').insertOne({
      _id: accountId,
      serverURL: SEED_SERVER_URL,
      name: 'Dev User',
      username: 'devuser',
      accountName: '@devuser@mastodon.seed.local',
      accountURL: `${SEED_SERVER_URL}/@devuser`,
      avatarURL: `${SEED_SERVER_URL}/avatars/original/missing.png`,
      isActive: true,
      setupComplete: true,
      owner: devUserId,
      utcOffset: '+01:00',
      timezone: 'Europe/Berlin',
      requestedScope: ['read'],
      tootHistoryComplete: true,
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    // Create account credentials (encrypted fake token)
    const encryptedToken = encryptText('seed-fake-access-token');
    await db.collection('accountcredentials').insertOne({
      _id: new ObjectId(),
      account: accountId,
      accessToken: encryptedToken,
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    // Generate daily account stats (90 days)
    const accountStats = this.generateDailyAccountStats(accountId);
    await db.collection('dailyaccountstats').insertMany(accountStats);
    totalRecords += accountStats.length;

    // Generate toots (50)
    const toots = this.generateToots(accountId);
    await db.collection('toots').insertMany(toots);
    totalRecords += toots.length;

    // Generate daily toot stats (90 days)
    const tootStats = this.generateDailyTootStats(accountId);
    await db.collection('dailytootstats').insertMany(tootStats);
    totalRecords += tootStats.length;

    // Generate hashtag stats
    const hashtagStats = this.generateHashtagStats(accountId);
    await db.collection('hashtagstats').insertMany(hashtagStats);
    totalRecords += hashtagStats.length;

    return totalRecords;
  }

  private generateDailyAccountStats(accountId: ObjectId) {
    const stats = [];
    let followers = 850;
    let following = 200;
    let statuses = 120;

    for (let i = 89; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      followers += Math.floor(Math.random() * 8) - 1;
      following += Math.random() < 0.3 ? 1 : 0;
      statuses += Math.floor(Math.random() * 3);

      stats.push({
        _id: new ObjectId(),
        account: accountId,
        day,
        followersCount: Math.max(followers, 0),
        followingCount: Math.max(following, 0),
        statusesCount: Math.max(statuses, 0),
      });
    }

    return stats;
  }

  private generateToots(accountId: ObjectId) {
    const toots = [];

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);

      const isViral = Math.random() < 0.1;
      const baseEngagement = isViral ? 50 : 5;
      const variance = isViral ? 100 : 15;

      const favouritesCount = Math.floor(Math.random() * variance) + baseEngagement;
      const reblogsCount = Math.floor(favouritesCount * (0.3 + Math.random() * 0.5));
      const repliesCount = Math.floor(favouritesCount * (0.1 + Math.random() * 0.3));

      const tootTags: { name: string; url: string }[] = [];
      if (Math.random() < 0.6) {
        const tagCount = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < tagCount; t++) {
          const tag = HASHTAGS[Math.floor(Math.random() * HASHTAGS.length)];
          if (!tootTags.find((tt) => tt.name === tag)) {
            tootTags.push({ name: tag, url: `${SEED_SERVER_URL}/tags/${tag}` });
          }
        }
      }

      const template = TOOT_TEMPLATES[i % TOOT_TEMPLATES.length];
      const hashtagSuffix = tootTags.map((t) => `#${t.name}`).join(' ');
      const content = `<p>${template}${hashtagSuffix ? ' ' + hashtagSuffix : ''}</p>`;

      toots.push({
        _id: new ObjectId(),
        account: accountId,
        uri: `${SEED_SERVER_URL}/users/devuser/statuses/${100000 + i}`,
        url: `${SEED_SERVER_URL}/@devuser/${100000 + i}`,
        content,
        favouritesCount,
        reblogsCount,
        repliesCount,
        tags: tootTags.length > 0 ? tootTags : undefined,
        language: 'en',
        visibility: 'public',
        createdAt,
        fetchedAt: new Date(),
      });
    }

    return toots;
  }

  private generateDailyTootStats(accountId: ObjectId) {
    const stats = [];

    for (let i = 89; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const dayOfWeek = day.getDay();
      const weekdayMultiplier = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.2 : 0.8;

      const baseFavourites = Math.floor((Math.random() * 20 + 10) * weekdayMultiplier);
      const baseBoosts = Math.floor(baseFavourites * (0.3 + Math.random() * 0.4));
      const baseReplies = Math.floor(baseFavourites * (0.1 + Math.random() * 0.2));

      stats.push({
        _id: new ObjectId(),
        account: accountId,
        day,
        repliesCount: baseReplies,
        boostsCount: baseBoosts,
        favouritesCount: baseFavourites,
      });
    }

    return stats;
  }

  private generateHashtagStats(accountId: ObjectId) {
    const stats = [];
    const popularHashtags = HASHTAGS.slice(0, 5);

    for (const hashtag of popularHashtags) {
      for (let i = 89; i >= 0; i--) {
        if (Math.random() > 0.6) continue;

        const day = new Date();
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);

        stats.push({
          _id: new ObjectId(),
          account: accountId,
          day,
          hashtag,
          tootCount: Math.floor(Math.random() * 3) + 1,
          repliesCount: Math.floor(Math.random() * 5),
          reblogsCount: Math.floor(Math.random() * 8),
          favouritesCount: Math.floor(Math.random() * 15),
        });
      }
    }

    return stats;
  }
}
