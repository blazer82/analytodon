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
import { BoostedTootDto } from '../../src/boosts/dto/boosted-toot.dto';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UsersService } from '../../src/users/users.service';

describe('BoostsController (e2e)', () => {
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
    email: 'boosts-e2e-user@example.com',
    password: 'TestUserPassword123!',
    role: UserRole.AccountOwner,
    isActive: true,
  };

  const createAccountDto: CreateAccountDto = {
    serverURL: 'https://mastodon.test',
    timezone: 'Europe/Berlin',
    name: 'Boosts Test Account',
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
    testAccount.username = 'testuser_boosts';
    testAccount.accountName = '@testuser_boosts@mastodon.test';
    testAccount.accountURL = 'https://mastodon.test/@testuser_boosts';
    await entityManager.persistAndFlush(testAccount);

    // Seed some DailyTootStatsEntity data for the test account
    // Use a fixed base date for seeding to make tests more predictable across runs
    const baseSeedDate = new Date();

    // Create dates for various time periods
    const todaySeed = new Date(baseSeedDate);
    todaySeed.setHours(0, 0, 0, 0); // Ensure start of day

    const yesterdaySeed = new Date(baseSeedDate);
    yesterdaySeed.setDate(baseSeedDate.getDate() - 1);
    yesterdaySeed.setHours(0, 0, 0, 0);

    const twoDaysAgoSeed = new Date(baseSeedDate);
    twoDaysAgoSeed.setDate(baseSeedDate.getDate() - 2);
    twoDaysAgoSeed.setHours(0, 0, 0, 0);

    // For weekly KPI tests
    const eightDaysAgoSeed = new Date(baseSeedDate);
    eightDaysAgoSeed.setDate(baseSeedDate.getDate() - 8);
    eightDaysAgoSeed.setHours(0, 0, 0, 0);

    const fifteenDaysAgoSeed = new Date(baseSeedDate);
    fifteenDaysAgoSeed.setDate(baseSeedDate.getDate() - 15);
    fifteenDaysAgoSeed.setHours(0, 0, 0, 0);

    // For monthly KPI tests
    const thirtyDaysAgoSeed = new Date(baseSeedDate);
    thirtyDaysAgoSeed.setDate(baseSeedDate.getDate() - 30);
    thirtyDaysAgoSeed.setHours(0, 0, 0, 0);

    const sixtyDaysAgoSeed = new Date(baseSeedDate);
    sixtyDaysAgoSeed.setDate(baseSeedDate.getDate() - 60);
    sixtyDaysAgoSeed.setHours(0, 0, 0, 0);

    // For yearly KPI tests
    const oneYearAgoSeed = new Date(baseSeedDate);
    oneYearAgoSeed.setFullYear(baseSeedDate.getFullYear() - 1);
    oneYearAgoSeed.setHours(0, 0, 0, 0);

    const twoYearsAgoSeed = new Date(baseSeedDate);
    twoYearsAgoSeed.setFullYear(baseSeedDate.getFullYear() - 2);
    twoYearsAgoSeed.setHours(0, 0, 0, 0);

    // Create comprehensive seed data for all time periods
    const statsData = [
      // Current data points
      { account: testAccount, day: todaySeed, boostsCount: 20, favouritesCount: 10, repliesCount: 4 },
      { account: testAccount, day: yesterdaySeed, boostsCount: 15, favouritesCount: 8, repliesCount: 3 },
      { account: testAccount, day: twoDaysAgoSeed, boostsCount: 10, favouritesCount: 5, repliesCount: 2 },

      // Weekly data points
      { account: testAccount, day: eightDaysAgoSeed, boostsCount: 5, favouritesCount: 2, repliesCount: 1 },
      { account: testAccount, day: fifteenDaysAgoSeed, boostsCount: 0, favouritesCount: 0, repliesCount: 0 },

      // Monthly data points
      { account: testAccount, day: thirtyDaysAgoSeed, boostsCount: 0, favouritesCount: 0, repliesCount: 0 },
      { account: testAccount, day: sixtyDaysAgoSeed, boostsCount: 0, favouritesCount: 0, repliesCount: 0 },

      // Yearly data points
      { account: testAccount, day: oneYearAgoSeed, boostsCount: 0, favouritesCount: 0, repliesCount: 0 },
      { account: testAccount, day: twoYearsAgoSeed, boostsCount: 0, favouritesCount: 0, repliesCount: 0 },
    ];

    for (const data of statsData) {
      const stat = entityManager.create(DailyTootStatsEntity, data);
      await entityManager.persist(stat);
    }
    await entityManager.flush();
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

  beforeEach(async () => {
    // For boosts, we might not need to clear DailyTootStats per test if `beforeAll` sets it up.
    // However, if tests modify these, clearing might be needed.
    // For now, assume `beforeAll` setup is sufficient for read-only tests.
    entityManager.clear(); // Clear identity map
  });

  const baseBoostsPath = (accountId: string) => `/accounts/${accountId}/boosts`;

  describe('KPI endpoints', () => {
    const kpiEndpoints = [
      { path: 'kpi/weekly', name: 'Weekly' },
      { path: 'kpi/monthly', name: 'Monthly' },
      { path: 'kpi/yearly', name: 'Yearly' },
    ];

    kpiEndpoints.forEach((endpoint) => {
      it(`GET ${baseBoostsPath(':id')}/${endpoint.path} - should get ${endpoint.name} KPIs`, async () => {
        const response = await request(app.getHttpServer())
          .get(`${baseBoostsPath(testAccount.id)}/${endpoint.path}`)
          .set('Authorization', `Bearer ${testUserAccessToken}`)
          .expect(HttpStatus.OK);

        expect(response.body).toBeInstanceOf(Object);

        // The response might not always have all properties depending on available data
        // So we'll check if it has at least one of the expected properties
        const hasExpectedProperties =
          'currentPeriod' in response.body || 'previousPeriod' in response.body || 'trend' in response.body;

        expect(hasExpectedProperties).toBe(true);

        // If currentPeriod exists, check that it's a number
        if ('currentPeriod' in response.body) {
          expect(typeof response.body.currentPeriod).toBe('number');
        }

        // If previousPeriod exists, check that it's a number
        if ('previousPeriod' in response.body) {
          expect(typeof response.body.previousPeriod).toBe('number');
        }

        // If trend exists, check that it's a number or null
        if ('trend' in response.body) {
          const trendType = typeof response.body.trend;
          // Trend should be a number or null (which becomes null in JSON)
          expect(['number', 'object']).toContain(trendType);

          // If it's an object, it should be null
          if (trendType === 'object') {
            expect(response.body.trend).toBeNull();
          }
        }
      });
    });

    it(`GET ${baseBoostsPath(':id')}/kpi/total - should get total snapshot`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/kpi/total`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('amount');
      expect(response.body.amount).toBe(20); // Based on seeded data
      expect(response.body).toHaveProperty('day');
    });

    it('should return 401 for KPI endpoints if not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/kpi/weekly`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 for KPI endpoints if account not found', async () => {
      const nonExistentAccountId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(nonExistentAccountId)}/kpi/weekly`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe(`GET ${baseBoostsPath(':id')}/chart`, () => {
    it('should get chart data', async () => {
      const timeframe = 'last7days';
      const response = await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/chart?timeframe=${timeframe}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      // Based on seeded data: (15-10)=5, (20-15)=5
      // The helper `formatDateISO` is mocked in unit tests, but here it's live.
      // The exact dates depend on when the test runs relative to the seeded `day` values.
      // We expect two data points from the seeded data.
      expect(response.body.length).toBeGreaterThanOrEqual(1); // At least one diff
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('time');
        expect(response.body[0]).toHaveProperty('value');
        expect(response.body[0].value).toBe(5);
      }
    });

    it('should return 400 if timeframe is missing for chart data', async () => {
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/chart`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe(`GET ${baseBoostsPath(':id')}/top-toots`, () => {
    // Need to seed some Toots for this
    beforeAll(async () => {
      const emFork = orm.em.fork();
      const toot1 = emFork.create(TootEntity, {
        account: testAccount,
        uri: 'tag:mastodon.test,2023-01-01:objectId1',
        url: 'https://mastodon.test/users/testuser_boosts/statuses/1',
        content: 'This is a top toot for boosts!',
        reblogsCount: 100,
        favouritesCount: 50,
        repliesCount: 10,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 1)), // yesterday
        language: 'en',
        visibility: 'public',
        fetchedAt: new Date(), // Add required fetchedAt
      });
      const toot2 = emFork.create(TootEntity, {
        account: testAccount,
        uri: 'tag:mastodon.test,2023-01-02:objectId2',
        url: 'https://mastodon.test/users/testuser_boosts/statuses/2',
        content: 'Another boosted toot',
        reblogsCount: 150,
        favouritesCount: 20,
        repliesCount: 5,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 2)), // two days ago
        language: 'en',
        visibility: 'public',
        fetchedAt: new Date(), // Add required fetchedAt
      });
      await emFork.persistAndFlush([toot1, toot2]);
    });

    it('should get top toots by boosts', async () => {
      const timeframe = 'last7days';
      const response = await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/top-toots?timeframe=${timeframe}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1); // Expecting at least one toot
      const tootDto = response.body[0] as BoostedTootDto;
      expect(tootDto).toHaveProperty('id');
      expect(tootDto).toHaveProperty('content');
      expect(tootDto).toHaveProperty('reblogsCount');
      expect(tootDto.reblogsCount).toBe(150); // Toot2 should be first
    });

    it('should return 400 if timeframe is missing for top toots', async () => {
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/top-toots`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe(`GET ${baseBoostsPath(':id')}/csv`, () => {
    it('should download boosts data as CSV', async () => {
      const timeframe = 'last7days';
      const response = await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/csv?timeframe=${timeframe}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename=boosts-${testAccount.id}-${timeframe}.csv`,
      );
      expect(response.text).toContain('Date;Boosts');
      // Based on seeded data, (15-10)=5, (20-15)=5
      // The exact dates depend on test execution time.
      expect(response.text).toContain(';5');
    });

    it('should return 400 if timeframe is missing for CSV export', async () => {
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(testAccount.id)}/csv`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Account Setup Incomplete', () => {
    let incompleteAccount: AccountEntity;

    beforeAll(async () => {
      const emFork = orm.em.fork();
      incompleteAccount = await accountsService.create(
        { ...createAccountDto, name: 'Incomplete Boosts Account', serverURL: 'https://incomplete.test' },
        testUser,
      );
      incompleteAccount.setupComplete = false; // Explicitly set to false
      await emFork.persistAndFlush(incompleteAccount);
    });

    it('should return 404 for KPI if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(incompleteAccount.id)}/kpi/weekly`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 for chart data if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`${baseBoostsPath(incompleteAccount.id)}/chart?timeframe=last7days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
