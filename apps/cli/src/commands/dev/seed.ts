import { Flags } from '@oclif/core';
import { MongoClient, ObjectId } from 'mongodb';

import { BaseCommand } from '../../base';
import { encryptText } from '../../helpers/encryption';
import { trackJobRun } from '../../helpers/trackJobRun';

const SEED_EMAILS = ['dev@analytodon.local', 'admin@analytodon.local', 'demo@analytodon.local'];
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

const MARKETING_TOOT_TEMPLATES = [
  'We just crossed 2,000 followers! Thank you all for being part of this journey.',
  'Thread: 5 things I learned about growing a community on the Fediverse',
  'New blog post: Why decentralized analytics matter more than ever',
  'Hot take: The best time to post on Mastodon is not when you think',
  'Our open-source analytics tool just got a major update. Here is what changed.',
  'Just migrated from Twitter and I already feel more at home here.',
  'Tip: Use hashtags strategically — here is how to find the right ones for your niche.',
  'The engagement on Mastodon feels so much more genuine. Numbers do not lie.',
  'Celebrating one year on the Fediverse! Here is my journey in numbers.',
  'What if I told you your follower count matters less than you think?',
  'Behind the scenes: How we built our analytics dashboard with open source tools.',
  'Weekend reading: The state of decentralized social media in 2025.',
  'Quick poll: What analytics metric matters most to you?',
  'Just shipped a huge update to our hashtag tracking feature.',
  'The Fediverse is growing faster than most people realize. Here are the stats.',
  'Three months of consistent posting later — here is what the data shows.',
  'Shoutout to everyone building tools for the open web. You are amazing.',
  'PSA: Your data belongs to you. Full stop.',
  'I analyzed 10,000 Mastodon posts to find what drives engagement. Results inside.',
  'Today we open-sourced our entire analytics pipeline. Link in bio.',
  'Community update: New features shipping this week based on your feedback.',
  'Mastodon vs Twitter engagement: A data-driven comparison from our dashboard.',
  'The beauty of federation is that no single entity controls the conversation.',
  'New milestone: 500 posts analyzed through our platform this month alone.',
  'Looking at the data, morning posts consistently outperform evening ones.',
  'Our privacy-first approach to analytics means zero tracking cookies. Here is how.',
  'Unpopular opinion: Follower counts are vanity metrics. Engagement rate is king.',
  'Just released our Q1 Fediverse growth report. The numbers are encouraging.',
  'Sometimes the best content strategy is just being authentic.',
  'The IndieWeb movement and the Fediverse are more connected than you think.',
  'Wrapping up a productive week with some gratitude for this community.',
  'Feature request fulfilled: You can now export your analytics as CSV.',
  'Why we chose to build on ActivityPub instead of a proprietary API.',
  'Monthly recap: Your top-performing content and what we can learn from it.',
  'Data visualization tip: Sometimes a simple line chart tells the best story.',
  'Happy to announce our integration with more Mastodon-compatible platforms.',
  'The conversation around digital privacy is finally going mainstream.',
  'Interesting trend: Collaborative threads get 3x more engagement than solo posts.',
  'Thank you for 1,000 boosts on our last update. This community is incredible.',
  'Building in public means sharing the failures too. Here is what did not work.',
];

const MARKETING_HASHTAGS: { name: string; tier: 'top' | 'mid' | 'low' }[] = [
  { name: 'fediverse', tier: 'top' },
  { name: 'mastodon', tier: 'top' },
  { name: 'analytics', tier: 'top' },
  { name: 'opensource', tier: 'mid' },
  { name: 'dataviz', tier: 'mid' },
  { name: 'indieweb', tier: 'mid' },
  { name: 'privacy', tier: 'low' },
  { name: 'decentralized', tier: 'low' },
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
        this.log('  demo@analytodon.local / password (marketing screenshots)');

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

    // Create accounts
    const accountId = new ObjectId();
    const adminAccountId = new ObjectId();

    await db.collection('accounts').insertMany([
      {
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
      },
      {
        _id: adminAccountId,
        serverURL: SEED_SERVER_URL,
        name: 'Admin User',
        username: 'adminuser',
        accountName: '@adminuser@mastodon.seed.local',
        accountURL: `${SEED_SERVER_URL}/@adminuser`,
        avatarURL: `${SEED_SERVER_URL}/avatars/original/missing.png`,
        isActive: true,
        setupComplete: true,
        owner: adminUserId,
        utcOffset: '+01:00',
        timezone: 'Europe/Berlin',
        requestedScope: ['read'],
        tootHistoryComplete: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    totalRecords += 2;

    // Create account credentials (encrypted fake tokens)
    const encryptedToken = encryptText('seed-fake-access-token');
    await db.collection('accountcredentials').insertMany([
      {
        _id: new ObjectId(),
        account: accountId,
        accessToken: encryptedToken,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: new ObjectId(),
        account: adminAccountId,
        accessToken: encryptedToken,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    totalRecords += 2;

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

    // Create marketing/demo user
    const demoUserId = new ObjectId();
    await db.collection('users').insertOne({
      _id: demoUserId,
      email: 'demo@analytodon.local',
      emailVerified: true,
      role: 'account-owner',
      isActive: true,
      timezone: 'Europe/Berlin',
      locale: 'en',
      maxAccounts: 3,
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    await db.collection('usercredentials').insertOne({
      _id: new ObjectId(),
      user: demoUserId,
      passwordHash: PASSWORD_HASH,
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    const demoAccountId = new ObjectId();
    await db.collection('accounts').insertOne({
      _id: demoAccountId,
      serverURL: SEED_SERVER_URL,
      name: 'Sarah Chen',
      username: 'sarahchen',
      accountName: '@sarahchen@mastodon.seed.local',
      accountURL: `${SEED_SERVER_URL}/@sarahchen`,
      avatarURL: `${SEED_SERVER_URL}/avatars/original/missing.png`,
      isActive: true,
      setupComplete: true,
      owner: demoUserId,
      utcOffset: '+01:00',
      timezone: 'Europe/Berlin',
      requestedScope: ['read'],
      tootHistoryComplete: true,
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    await db.collection('accountcredentials').insertOne({
      _id: new ObjectId(),
      account: demoAccountId,
      accessToken: encryptedToken,
      createdAt: now,
      updatedAt: now,
    });
    totalRecords += 1;

    const rand = this.seededRandom(42);

    const demoAccountStats = this.generateMarketingDailyAccountStats(demoAccountId, rand);
    await db.collection('dailyaccountstats').insertMany(demoAccountStats);
    totalRecords += demoAccountStats.length;

    const demoToots = this.generateMarketingToots(demoAccountId, rand);
    await db.collection('toots').insertMany(demoToots);
    totalRecords += demoToots.length;

    const demoTootStats = this.generateMarketingDailyTootStats(demoAccountId, rand);
    await db.collection('dailytootstats').insertMany(demoTootStats);
    totalRecords += demoTootStats.length;

    const demoHashtagStats = this.generateMarketingHashtagStats(demoAccountId, rand);
    await db.collection('hashtagstats').insertMany(demoHashtagStats);
    totalRecords += demoHashtagStats.length;

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

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  private generateMarketingDailyAccountStats(accountId: ObjectId, rand: () => number) {
    const stats = [];
    let noise = 0;
    let prevFollowers = 0;
    let following = 180;
    let statuses = 300;

    for (let i = 364; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const t = (365 - i) / 365;

      const logistic = 1 / (1 + Math.exp(-12 * (t - 0.35)));
      const baseFollowers = 800 + Math.round(1800 * logistic);

      const dayOfYear = Math.floor((day.getTime() - new Date(day.getFullYear(), 0, 0).getTime()) / 86400000);
      const seasonalFactor = 1 + 0.02 * Math.sin((2 * Math.PI * dayOfYear) / 365 - Math.PI / 4);

      noise += rand() * 6 - 3;
      noise = Math.max(-15, Math.min(15, noise));

      let followers = Math.round(baseFollowers * seasonalFactor) + Math.round(noise);
      if (prevFollowers > 0) {
        followers = Math.max(followers, prevFollowers - 2);
      }
      prevFollowers = followers;

      following += rand() < 0.3 ? 1 : 0;
      statuses += Math.floor(rand() * 2) + (rand() < 0.4 ? 1 : 0);

      stats.push({
        _id: new ObjectId(),
        account: accountId,
        day,
        followersCount: followers,
        followingCount: following,
        statusesCount: statuses,
      });
    }

    return stats;
  }

  private generateMarketingDailyTootStats(accountId: ObjectId, rand: () => number) {
    const stats = [];
    let cumulativeFavourites = 0;
    let cumulativeBoosts = 0;
    let cumulativeReplies = 0;

    for (let i = 364; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const t = (365 - i) / 365;
      const growthMultiplier = 0.5 + 1.5 * t;

      const dayOfWeek = day.getDay();
      const weekdayFactor = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.2 : 0.75;

      const spikeFactor = rand() < 0.05 ? 2.0 + rand() * 2.0 : 1.0;

      const dailyFavourites = Math.round((15 + rand() * 20) * growthMultiplier * weekdayFactor * spikeFactor);
      const dailyBoosts = Math.round(dailyFavourites * (0.35 + rand() * 0.25));
      const dailyReplies = Math.round(dailyFavourites * (0.15 + rand() * 0.15));

      cumulativeFavourites += dailyFavourites;
      cumulativeBoosts += dailyBoosts;
      cumulativeReplies += dailyReplies;

      stats.push({
        _id: new ObjectId(),
        account: accountId,
        day,
        repliesCount: cumulativeReplies,
        boostsCount: cumulativeBoosts,
        favouritesCount: cumulativeFavourites,
      });
    }

    return stats;
  }

  private generateMarketingToots(accountId: ObjectId, rand: () => number) {
    const toots = [];

    for (let i = 0; i < 200; i++) {
      const t = Math.pow(rand(), 0.7);
      const daysAgo = Math.floor((1 - t) * 365);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(Math.floor(rand() * 14) + 8, Math.floor(rand() * 60), 0, 0);

      const u = rand();
      let favouritesCount: number;
      if (u < 0.05) {
        favouritesCount = 100 + Math.floor(rand() * 200);
      } else if (u < 0.2) {
        favouritesCount = 30 + Math.floor(rand() * 70);
      } else {
        favouritesCount = 3 + Math.floor(rand() * 27);
      }

      const reblogsCount = Math.floor(favouritesCount * (0.25 + rand() * 0.45));
      const repliesCount = Math.floor(favouritesCount * (0.08 + rand() * 0.22));

      const tootTags: { name: string; url: string }[] = [];
      if (rand() < 0.7) {
        const tagCount = Math.floor(rand() * 3) + 1;
        for (let t = 0; t < tagCount; t++) {
          const tierRoll = rand();
          const tierHashtags = MARKETING_HASHTAGS.filter(
            (h) =>
              (tierRoll < 0.5 && h.tier === 'top') ||
              (tierRoll >= 0.5 && tierRoll < 0.8 && h.tier === 'mid') ||
              (tierRoll >= 0.8 && h.tier === 'low'),
          );
          const pool = tierHashtags.length > 0 ? tierHashtags : MARKETING_HASHTAGS;
          const tag = pool[Math.floor(rand() * pool.length)];
          if (!tootTags.find((tt) => tt.name === tag.name)) {
            tootTags.push({ name: tag.name, url: `${SEED_SERVER_URL}/tags/${tag.name}` });
          }
        }
      }

      const template = MARKETING_TOOT_TEMPLATES[i % MARKETING_TOOT_TEMPLATES.length];
      const hashtagSuffix = tootTags.map((t) => `#${t.name}`).join(' ');
      const content = `<p>${template}${hashtagSuffix ? ' ' + hashtagSuffix : ''}</p>`;

      toots.push({
        _id: new ObjectId(),
        account: accountId,
        uri: `${SEED_SERVER_URL}/users/sarahchen/statuses/${200000 + i}`,
        url: `${SEED_SERVER_URL}/@sarahchen/${200000 + i}`,
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

  private generateMarketingHashtagStats(accountId: ObjectId, rand: () => number) {
    const stats = [];

    const tierConfig = {
      top: { probability: 0.85, engagementMultiplier: 3.0 },
      mid: { probability: 0.55, engagementMultiplier: 1.5 },
      low: { probability: 0.25, engagementMultiplier: 1.0 },
    };

    for (const hashtag of MARKETING_HASHTAGS) {
      const config = tierConfig[hashtag.tier];

      for (let i = 364; i >= 0; i--) {
        if (rand() > config.probability) continue;

        const day = new Date();
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);

        const t = (365 - i) / 365;
        const growthFactor = 0.6 + 0.8 * t;

        const dayOfYear = Math.floor((day.getTime() - new Date(day.getFullYear(), 0, 0).getTime()) / 86400000);
        let seasonalBoost = 1.0;
        if (hashtag.name === 'fediverse') {
          seasonalBoost = 1 + 0.4 * Math.max(0, Math.sin((2 * Math.PI * (dayOfYear - 90)) / 365));
        } else if (hashtag.name === 'privacy') {
          seasonalBoost = 1 + 0.5 * Math.max(0, Math.cos((2 * Math.PI * dayOfYear) / 365));
        } else if (hashtag.name === 'opensource') {
          seasonalBoost = 1 + 0.6 * Math.max(0, Math.sin((2 * Math.PI * (dayOfYear - 280)) / 365));
        }

        const tootCount = 1 + (rand() < 0.3 ? 1 : 0) + (rand() < 0.1 ? 1 : 0);
        const favouritesCount = Math.round(
          (5 + rand() * 15) * config.engagementMultiplier * growthFactor * seasonalBoost,
        );
        const reblogsCount = Math.round(favouritesCount * (0.3 + rand() * 0.3));
        const repliesCount = Math.round(favouritesCount * (0.1 + rand() * 0.2));

        stats.push({
          _id: new ObjectId(),
          account: accountId,
          day,
          hashtag: hashtag.name,
          tootCount,
          repliesCount,
          reblogsCount,
          favouritesCount,
        });
      }
    }

    return stats;
  }
}
