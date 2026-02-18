import { AdminStatsSnapshotEntity, UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { StringValue } from 'ms';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UsersService } from '../../src/users/users.service';

describe('AdminController (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;
  let usersService: UsersService;

  let adminAccessToken: string;
  let nonAdminAccessToken: string;

  const adminCredentials = {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
  };

  const snapshotData = {
    users: {
      totalCount: 3,
      activeCount: 2,
      inactiveCount: 1,
      emailVerifiedCount: 2,
      roleBreakdown: { admin: 1, accountOwner: 2 },
      registrations: {
        last30DaysCount: 3,
        dailyBreakdown: [{ date: '2026-02-15', count: 3 }],
      },
      loginActivity: { last7Days: 1, last30Days: 2, last90Days: 3 },
    },
    accounts: {
      totalCount: 3,
      setupCompleteCount: 2,
      setupIncompleteCount: 1,
      activeCount: 2,
      inactiveCount: 1,
      serverDistribution: [
        { serverURL: 'mastodon.social', count: 2 },
        { serverURL: 'mastodon.online', count: 1 },
      ],
    },
    dataVolume: {
      totalToots: 500,
      totalDailyAccountStats: 100,
      totalDailyTootStats: 200,
    },
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

    await clearDatabase();

    // Create admin user
    const adminUser = await usersService.create({
      ...adminCredentials,
      role: UserRole.Admin,
      isActive: true,
    });
    adminUser.emailVerified = true;
    adminUser.lastLoginAt = new Date();
    await entityManager.persistAndFlush(adminUser);

    const adminPayload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
    adminAccessToken = jwtService.sign(adminPayload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<StringValue>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });

    // Create non-admin user for forbidden test
    const nonAdminUser = await usersService.create({
      email: 'user@example.com',
      password: 'UserPassword123!',
      role: UserRole.AccountOwner,
      isActive: true,
    });
    const nonAdminPayload = { sub: nonAdminUser.id, email: nonAdminUser.email, role: nonAdminUser.role };
    nonAdminAccessToken = jwtService.sign(nonAdminPayload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<StringValue>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });

    // Seed admin stats snapshot
    const snapshot = entityManager.create(AdminStatsSnapshotEntity, {
      generatedAt: new Date('2026-02-18T03:00:00.000Z'),
      data: snapshotData,
    });
    await entityManager.persistAndFlush(snapshot);
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(AdminStatsSnapshotEntity, {});
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  describe('GET /admin/stats', () => {
    it('should return 200 with correct structure for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      // Verify top-level structure
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('accounts');
      expect(response.body).toHaveProperty('dataVolume');

      // Verify user metrics structure
      const { users } = response.body;
      expect(users).toHaveProperty('totalCount');
      expect(users).toHaveProperty('activeCount');
      expect(users).toHaveProperty('inactiveCount');
      expect(users).toHaveProperty('emailVerifiedCount');
      expect(users).toHaveProperty('roleBreakdown');
      expect(users.roleBreakdown).toHaveProperty('admin');
      expect(users.roleBreakdown).toHaveProperty('accountOwner');
      expect(users).toHaveProperty('registrations');
      expect(users.registrations).toHaveProperty('last30DaysCount');
      expect(users.registrations).toHaveProperty('dailyBreakdown');
      expect(users).toHaveProperty('loginActivity');
      expect(users.loginActivity).toHaveProperty('last7Days');
      expect(users.loginActivity).toHaveProperty('last30Days');
      expect(users.loginActivity).toHaveProperty('last90Days');

      // Verify account metrics structure
      const { accounts } = response.body;
      expect(accounts).toHaveProperty('totalCount');
      expect(accounts).toHaveProperty('setupCompleteCount');
      expect(accounts).toHaveProperty('setupIncompleteCount');
      expect(accounts).toHaveProperty('activeCount');
      expect(accounts).toHaveProperty('inactiveCount');
      expect(accounts).toHaveProperty('serverDistribution');

      // Verify data volume structure
      const { dataVolume } = response.body;
      expect(dataVolume).toHaveProperty('totalToots');
      expect(dataVolume).toHaveProperty('totalDailyAccountStats');
      expect(dataVolume).toHaveProperty('totalDailyTootStats');
    });

    it('should return correct counts matching seeded snapshot data', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.generatedAt).toBe('2026-02-18T03:00:00.000Z');

      const { users, accounts, dataVolume } = response.body;

      expect(users.totalCount).toBe(3);
      expect(users.activeCount).toBe(2);
      expect(users.inactiveCount).toBe(1);
      expect(users.roleBreakdown.admin).toBe(1);
      expect(users.roleBreakdown.accountOwner).toBe(2);

      expect(accounts.totalCount).toBe(3);
      expect(accounts.setupCompleteCount).toBe(2);
      expect(accounts.setupIncompleteCount).toBe(1);
      expect(accounts.activeCount).toBe(2);
      expect(accounts.inactiveCount).toBe(1);

      expect(accounts.serverDistribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ serverURL: 'mastodon.social', count: 2 }),
          expect.objectContaining({ serverURL: 'mastodon.online', count: 1 }),
        ]),
      );

      expect(dataVolume.totalToots).toBe(500);
      expect(dataVolume.totalDailyAccountStats).toBe(100);
      expect(dataVolume.totalDailyTootStats).toBe(200);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/admin/stats').expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${nonAdminAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
