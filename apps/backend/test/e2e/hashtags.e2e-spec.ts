import { AccountEntity, HashtagStatsEntity, UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import type { StringValue } from 'ms';
import * as request from 'supertest';

import { AccountsService } from '../../src/accounts/accounts.service';
import { CreateAccountDto } from '../../src/accounts/dto/create-account.dto';
import { AppModule } from '../../src/app.module';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UsersService } from '../../src/users/users.service';

describe('HashtagsController (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;
  let usersService: UsersService;
  let accountsService: AccountsService;

  let testUser: UserEntity;
  let testUserAccessToken: string;
  let testAccount: AccountEntity;

  const testUserData = {
    email: 'hashtags-e2e-user@example.com',
    password: 'TestUserPassword123!',
    role: UserRole.AccountOwner,
    isActive: true,
  };

  const createAccountDto: CreateAccountDto = {
    serverURL: 'https://mastodon.test',
    timezone: 'Europe/Berlin',
    name: 'Hashtags Test Account',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    orm = moduleFixture.get(MikroORM);
    entityManager = moduleFixture.get(EntityManager).fork();
    jwtService = moduleFixture.get(JwtService);
    configService = moduleFixture.get(ConfigService);
    usersService = moduleFixture.get(UsersService);
    accountsService = moduleFixture.get(AccountsService);

    await clearDatabase();
    testUser = await usersService.create(testUserData);
    testUser.emailVerified = true;
    await entityManager.persistAndFlush(testUser);

    const payload = { sub: testUser.id, email: testUser.email, role: testUser.role };
    testUserAccessToken = jwtService.sign(payload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<StringValue>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });

    testAccount = await accountsService.create(createAccountDto, testUser);
    testAccount.setupComplete = true;
    testAccount.username = 'testuser_hashtags';
    testAccount.accountName = '@testuser_hashtags@mastodon.test';
    testAccount.accountURL = 'https://mastodon.test/@testuser_hashtags';
    await entityManager.persistAndFlush(testAccount);

    // Seed HashtagStatsEntity data
    const baseSeedDate = new Date();

    const yesterdaySeed = new Date(baseSeedDate);
    yesterdaySeed.setDate(baseSeedDate.getDate() - 1);
    yesterdaySeed.setHours(0, 0, 0, 0);

    const twoDaysAgoSeed = new Date(baseSeedDate);
    twoDaysAgoSeed.setDate(baseSeedDate.getDate() - 2);
    twoDaysAgoSeed.setHours(0, 0, 0, 0);

    const fiveDaysAgoSeed = new Date(baseSeedDate);
    fiveDaysAgoSeed.setDate(baseSeedDate.getDate() - 5);
    fiveDaysAgoSeed.setHours(0, 0, 0, 0);

    const hashtagStatsData = [
      // typescript - used often, good engagement
      {
        account: testAccount,
        day: yesterdaySeed,
        hashtag: 'typescript',
        tootCount: 5,
        repliesCount: 10,
        reblogsCount: 20,
        favouritesCount: 30,
      },
      {
        account: testAccount,
        day: twoDaysAgoSeed,
        hashtag: 'typescript',
        tootCount: 3,
        repliesCount: 6,
        reblogsCount: 12,
        favouritesCount: 18,
      },
      // rust - used less but high engagement per toot
      {
        account: testAccount,
        day: yesterdaySeed,
        hashtag: 'rust',
        tootCount: 2,
        repliesCount: 8,
        reblogsCount: 15,
        favouritesCount: 25,
      },
      {
        account: testAccount,
        day: fiveDaysAgoSeed,
        hashtag: 'rust',
        tootCount: 1,
        repliesCount: 4,
        reblogsCount: 7,
        favouritesCount: 12,
      },
      // javascript - single use
      {
        account: testAccount,
        day: twoDaysAgoSeed,
        hashtag: 'javascript',
        tootCount: 1,
        repliesCount: 1,
        reblogsCount: 2,
        favouritesCount: 3,
      },
    ];

    for (const data of hashtagStatsData) {
      const stat = entityManager.create(HashtagStatsEntity, data);
      await entityManager.persist(stat);
    }
    await entityManager.flush();
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(HashtagStatsEntity, {});
    await entityManager.nativeDelete(AccountEntity, {});
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  beforeEach(async () => {
    entityManager.clear();
  });

  const baseHashtagsPath = (accountId: string) => `/accounts/${accountId}/hashtags`;

  describe('GET /top', () => {
    it('should get top hashtags', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/top?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('hashtag');
      expect(response.body[0]).toHaveProperty('tootCount');
      expect(response.body[0]).toHaveProperty('repliesCount');
      expect(response.body[0]).toHaveProperty('reblogsCount');
      expect(response.body[0]).toHaveProperty('favouritesCount');
      // typescript should be first (highest tootCount: 5+3=8)
      expect(response.body[0].hashtag).toBe('typescript');
      expect(response.body[0].tootCount).toBe(8);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/top?timeframe=last30days`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 for non-existent account', async () => {
      const nonExistentAccountId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(nonExistentAccountId)}/top?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 if timeframe is missing', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/top`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /over-time', () => {
    it('should get hashtag usage over time', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/over-time?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('hashtags');
      expect(response.body).toHaveProperty('data');
      expect(response.body.hashtags).toBeInstanceOf(Array);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.hashtags.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      // Each data point should have a 'day' property
      expect(response.body.data[0]).toHaveProperty('day');
    });

    it('should return 400 if timeframe is missing', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/over-time`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /engagement', () => {
    it('should get engagement data', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/engagement?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('hashtag');
      expect(response.body[0]).toHaveProperty('tootCount');
      expect(response.body[0]).toHaveProperty('totalEngagement');
      expect(response.body[0]).toHaveProperty('avgEngagementPerToot');
      expect(response.body[0]).toHaveProperty('repliesCount');
      expect(response.body[0]).toHaveProperty('reblogsCount');
      expect(response.body[0]).toHaveProperty('favouritesCount');
    });

    it('should return 400 if timeframe is missing', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/engagement`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /most-effective', () => {
    it('should get most effective hashtags', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/most-effective?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      // javascript has only 1 toot, so with default minTootCount=2 it should be excluded
      const hashtags = response.body.map((r: { hashtag: string }) => r.hashtag);
      expect(hashtags).not.toContain('javascript');
      // typescript and rust should be present (both have >= 2 toots)
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('avgEngagementPerToot');
        expect(typeof response.body[0].avgEngagementPerToot).toBe('number');
      }
    });

    it('should respect custom minTootCount', async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/most-effective?timeframe=last30days&minTootCount=1`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      // With minTootCount=1, javascript should also be included
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 400 if timeframe is missing', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(testAccount.id)}/most-effective`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Account Setup Incomplete', () => {
    let incompleteAccount: AccountEntity;

    beforeAll(async () => {
      const emFork = orm.em.fork();
      incompleteAccount = await accountsService.create(
        { ...createAccountDto, name: 'Incomplete Hashtags Account', serverURL: 'https://incomplete.test' },
        testUser,
      );
      incompleteAccount.setupComplete = false;
      await emFork.persistAndFlush(incompleteAccount);
    });

    it('should return 404 for top if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(incompleteAccount.id)}/top?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 for engagement if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`${baseHashtagsPath(incompleteAccount.id)}/engagement?timeframe=last30days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
