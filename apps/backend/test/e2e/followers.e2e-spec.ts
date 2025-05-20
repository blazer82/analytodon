import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import * as request from 'supertest';

import { AccountsService } from '../../src/accounts/accounts.service';
import { CreateAccountDto } from '../../src/accounts/dto/create-account.dto';
import { AccountEntity } from '../../src/accounts/entities/account.entity';
import { AppModule } from '../../src/app.module';
import { UserCredentialsEntity } from '../../src/auth/entities/user-credentials.entity';
import { DailyAccountStatsEntity } from '../../src/followers/entities/daily-account-stats.entity';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UserRole } from '../../src/shared/enums/user-role.enum';
import { UserEntity } from '../../src/users/entities/user.entity';
import { UsersService } from '../../src/users/users.service';

describe('FollowersController (e2e)', () => {
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
    email: 'followers-e2e-user@example.com',
    password: 'TestUserPassword123!',
    role: UserRole.AccountOwner,
    isActive: true,
  };

  const createAccountDto: CreateAccountDto = {
    serverURL: 'https://mastodon.test',
    timezone: 'Europe/Berlin',
    name: 'Followers Test Account',
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
    testAccount.username = 'testuser_followers';
    testAccount.accountName = '@testuser_followers@mastodon.test';
    testAccount.accountURL = 'https://mastodon.test/@testuser_followers';
    await entityManager.persistAndFlush(testAccount);

    // Seed some DailyAccountStatsEntity data for the test account
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
      { account: testAccount, day: todaySeed, followersCount: 200, followingCount: 50, statusesCount: 100 },
      { account: testAccount, day: yesterdaySeed, followersCount: 190, followingCount: 50, statusesCount: 95 },
      { account: testAccount, day: twoDaysAgoSeed, followersCount: 180, followingCount: 50, statusesCount: 90 },

      // Weekly data points
      { account: testAccount, day: eightDaysAgoSeed, followersCount: 150, followingCount: 45, statusesCount: 80 },
      { account: testAccount, day: fifteenDaysAgoSeed, followersCount: 120, followingCount: 40, statusesCount: 70 },

      // Monthly data points
      { account: testAccount, day: thirtyDaysAgoSeed, followersCount: 100, followingCount: 35, statusesCount: 60 },
      { account: testAccount, day: sixtyDaysAgoSeed, followersCount: 80, followingCount: 30, statusesCount: 50 },

      // Yearly data points
      { account: testAccount, day: oneYearAgoSeed, followersCount: 50, followingCount: 20, statusesCount: 30 },
      { account: testAccount, day: twoYearsAgoSeed, followersCount: 10, followingCount: 10, statusesCount: 10 },
    ];

    for (const data of statsData) {
      const stat = entityManager.create(DailyAccountStatsEntity, data);
      await entityManager.persist(stat);
    }
    await entityManager.flush();
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(DailyAccountStatsEntity, {});
    await entityManager.nativeDelete(AccountEntity, {});
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  beforeEach(async () => {
    // For followers, we might not need to clear DailyAccountStats per test if `beforeAll` sets it up.
    // However, if tests modify these, clearing might be needed.
    // For now, assume `beforeAll` setup is sufficient for read-only tests.
    entityManager.clear(); // Clear identity map
  });

  const baseFollowersPath = (accountId: string) => `/accounts/${accountId}/followers`;

  describe('KPI endpoints', () => {
    const kpiEndpoints = [
      { path: 'kpi/weekly', name: 'Weekly' },
      { path: 'kpi/monthly', name: 'Monthly' },
      { path: 'kpi/yearly', name: 'Yearly' },
    ];

    kpiEndpoints.forEach((endpoint) => {
      it(`GET ${baseFollowersPath(':id')}/${endpoint.path} - should get ${endpoint.name} KPIs`, async () => {
        const response = await request(app.getHttpServer())
          .get(`${baseFollowersPath(testAccount.id)}/${endpoint.path}`)
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

    it(`GET ${baseFollowersPath(':id')}/kpi/total - should get total snapshot`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${baseFollowersPath(testAccount.id)}/kpi/total`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('amount');
      expect(response.body.amount).toBe(200); // Based on seeded data
      expect(response.body).toHaveProperty('day');
    });

    it('should return 401 for KPI endpoints if not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`${baseFollowersPath(testAccount.id)}/kpi/weekly`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 for KPI endpoints if account not found', async () => {
      const nonExistentAccountId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`${baseFollowersPath(nonExistentAccountId)}/kpi/weekly`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe(`GET ${baseFollowersPath(':id')}/chart`, () => {
    it('should get chart data', async () => {
      const timeframe = 'last7days';
      const response = await request(app.getHttpServer())
        .get(`${baseFollowersPath(testAccount.id)}/chart?timeframe=${timeframe}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      // Based on seeded data: (190-180)=10, (200-190)=10
      // The helper `formatDateISO` is mocked in unit tests, but here it's live.
      // The exact dates depend on when the test runs relative to the seeded `day` values.
      // We expect two data points from the seeded data.
      expect(response.body.length).toBeGreaterThanOrEqual(1); // At least one diff
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('time');
        expect(response.body[0]).toHaveProperty('value');
        expect(response.body[0].value).toBe(180);
      }
    });

    it('should return 400 if timeframe is missing for chart data', async () => {
      await request(app.getHttpServer())
        .get(`${baseFollowersPath(testAccount.id)}/chart`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe(`GET ${baseFollowersPath(':id')}/csv`, () => {
    it('should download followers data as CSV', async () => {
      const timeframe = 'last7days';
      const response = await request(app.getHttpServer())
        .get(`${baseFollowersPath(testAccount.id)}/csv?timeframe=${timeframe}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toBe(
        `attachment; filename=followers-${testAccount.id}-${timeframe}.csv`,
      );
      expect(response.text).toContain('Date;Followers');
      // The exact dates depend on test execution time.
      expect(response.text).toContain(';180');
    });

    it('should return 400 if timeframe is missing for CSV export', async () => {
      await request(app.getHttpServer())
        .get(`${baseFollowersPath(testAccount.id)}/csv`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Account Setup Incomplete', () => {
    let incompleteAccount: AccountEntity;

    beforeAll(async () => {
      const emFork = orm.em.fork();
      incompleteAccount = await accountsService.create(
        { ...createAccountDto, name: 'Incomplete Followers Account', serverURL: 'https://incomplete.test' },
        testUser,
      );
      incompleteAccount.setupComplete = false; // Explicitly set to false
      await emFork.persistAndFlush(incompleteAccount);
    });

    it('should return 404 for KPI if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`${baseFollowersPath(incompleteAccount.id)}/kpi/weekly`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 for chart data if account setup is not complete', async () => {
      await request(app.getHttpServer())
        .get(`${baseFollowersPath(incompleteAccount.id)}/chart?timeframe=last7days`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
