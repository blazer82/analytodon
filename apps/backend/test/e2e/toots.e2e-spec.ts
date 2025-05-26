import {
  AccountEntity,
  DailyTootStatsEntity,
  TootEntity,
  UserCredentialsEntity,
  UserEntity,
  UserRole,
} from '@analytodon/shared-orm';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import * as request from 'supertest';

import { AccountsService } from '../../src/accounts/accounts.service';
import { CreateAccountDto } from '../../src/accounts/dto/create-account.dto';
import { AppModule } from '../../src/app.module';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UsersService } from '../../src/users/users.service';

describe('TootsController (e2e)', () => {
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
    email: 'toots-e2e-user@example.com',
    password: 'TestUserPassword123!',
    role: UserRole.AccountOwner,
    isActive: true,
  };

  const createAccountDto: CreateAccountDto = {
    serverURL: 'https://mastodon.test',
    timezone: 'Europe/Berlin',
    name: 'Toots Test Account',
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
      expiresIn: configService.get<string>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });

    // Create a test account for the user
    testAccount = await accountsService.create(createAccountDto, testUser);
    // Simulate account setup completion for tests that require it
    testAccount.setupComplete = true;
    testAccount.username = 'testuser_toots';
    testAccount.accountName = '@testuser_toots@mastodon.test';
    testAccount.accountURL = 'https://mastodon.test/@testuser_toots';
    await entityManager.persistAndFlush(testAccount);

    // Seed some toots for the test account
    await seedTestToots();
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(TootEntity, {});
    await entityManager.nativeDelete(DailyTootStatsEntity, {});
    await entityManager.nativeDelete(AccountEntity, {});
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  const seedTestToots = async () => {
    const emFork = orm.em.fork();

    // Create some test toots with different engagement metrics
    const toot1 = emFork.create(TootEntity, {
      account: testAccount,
      uri: 'tag:mastodon.test,2023-01-01:objectId1',
      url: 'https://mastodon.test/users/testuser_toots/statuses/1',
      content: 'This is a top toot with high engagement!',
      reblogsCount: 100,
      favouritesCount: 50,
      repliesCount: 30,
      createdAt: new Date(new Date().setDate(new Date().getDate() - 1)), // yesterday
      language: 'en',
      visibility: 'public',
      fetchedAt: new Date(),
    });

    const toot2 = emFork.create(TootEntity, {
      account: testAccount,
      uri: 'tag:mastodon.test,2023-01-02:objectId2',
      url: 'https://mastodon.test/users/testuser_toots/statuses/2',
      content: 'This toot has lots of replies!',
      reblogsCount: 20,
      favouritesCount: 15,
      repliesCount: 50,
      createdAt: new Date(new Date().setDate(new Date().getDate() - 2)), // two days ago
      language: 'en',
      visibility: 'public',
      fetchedAt: new Date(),
    });

    const toot3 = emFork.create(TootEntity, {
      account: testAccount,
      uri: 'tag:mastodon.test,2023-01-03:objectId3',
      url: 'https://mastodon.test/users/testuser_toots/statuses/3',
      content: 'This toot has lots of boosts!',
      reblogsCount: 150,
      favouritesCount: 10,
      repliesCount: 5,
      createdAt: new Date(new Date().setDate(new Date().getDate() - 3)), // three days ago
      language: 'en',
      visibility: 'public',
      fetchedAt: new Date(),
    });

    const toot4 = emFork.create(TootEntity, {
      account: testAccount,
      uri: 'tag:mastodon.test,2023-01-04:objectId4',
      url: 'https://mastodon.test/users/testuser_toots/statuses/4',
      content: 'This toot has lots of favorites!',
      reblogsCount: 10,
      favouritesCount: 200,
      repliesCount: 15,
      createdAt: new Date(new Date().setDate(new Date().getDate() - 4)), // four days ago
      language: 'en',
      visibility: 'public',
      fetchedAt: new Date(),
    });

    await emFork.persistAndFlush([toot1, toot2, toot3, toot4]);
  };

  beforeEach(async () => {
    entityManager.clear(); // Clear identity map
  });

  describe('GET /accounts/:accountId/toots/top-summary', () => {
    it('should get top toots summary with valid timeframe', async () => {
      const timeframe = 'last7days';
      const response = await request(app.getHttpServer())
        .get(`/accounts/${testAccount.id}/toots/top-summary?timeframe=${timeframe}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('top');
      expect(response.body).toHaveProperty('topByReplies');
      expect(response.body).toHaveProperty('topByBoosts');
      expect(response.body).toHaveProperty('topByFavorites');

      // Check that each category has the expected structure
      expect(response.body.top).toHaveProperty('data');
      expect(response.body.top).toHaveProperty('timeframe');
      expect(response.body.top.timeframe).toBe(timeframe);
      expect(Array.isArray(response.body.top.data)).toBe(true);

      // Check that we have toots in the response
      expect(response.body.top.data.length).toBeGreaterThan(0);

      // Check that the top toot has the expected properties
      const topToot = response.body.top.data[0];
      expect(topToot).toHaveProperty('id');
      expect(topToot).toHaveProperty('content');
      expect(topToot).toHaveProperty('url');
      expect(topToot).toHaveProperty('reblogsCount');
      expect(topToot).toHaveProperty('repliesCount');
      expect(topToot).toHaveProperty('favouritesCount');
      expect(topToot).toHaveProperty('createdAt');
      expect(topToot).toHaveProperty('rank');

      // Check that the top toots by replies has the highest replies count
      const topByReplies = response.body.topByReplies.data[0];
      expect(topByReplies.repliesCount).toBe(50);

      // Check that the top toots by boosts has the highest boosts count
      const topByBoosts = response.body.topByBoosts.data[0];
      expect(topByBoosts.reblogsCount).toBe(150);

      // Check that the top toots by favorites has the highest favorites count
      const topByFavorites = response.body.topByFavorites.data[0];
      expect(topByFavorites.favouritesCount).toBe(200);
    });

    it('should return 400 if timeframe is missing', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${testAccount.id}/toots/top-summary`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${testAccount.id}/toots/top-summary?timeframe=last7days`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 if account not found', async () => {
      const nonExistentAccountId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`/accounts/${nonExistentAccountId}/toots/top-summary?timeframe=last7days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Account Setup Incomplete', () => {
    let incompleteAccount: AccountEntity;

    beforeAll(async () => {
      const emFork = orm.em.fork();
      incompleteAccount = await accountsService.create(
        { ...createAccountDto, name: 'Incomplete Toots Account', serverURL: 'https://incomplete.test' },
        testUser,
      );
      incompleteAccount.setupComplete = false; // Explicitly set to false
      await emFork.persistAndFlush(incompleteAccount);
    });

    it('should return 404 for top-summary if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${incompleteAccount.id}/toots/top-summary?timeframe=last7days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
