import { AccountEntity, UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
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
  let adminUser: UserEntity;
  let nonAdminAccessToken: string;

  const adminCredentials = {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
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
    adminUser = await usersService.create({
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

    // Seed additional test data
    const user2 = await usersService.create({
      email: 'user2@example.com',
      password: 'User2Password123!',
      role: UserRole.AccountOwner,
      isActive: false,
    });
    user2.emailVerified = true;
    await entityManager.persistAndFlush(user2);

    // Create test accounts
    const account1 = entityManager.create(AccountEntity, {
      serverURL: 'mastodon.social',
      isActive: true,
      setupComplete: true,
      owner: adminUser,
      utcOffset: '+00:00',
      timezone: 'UTC',
    });

    const account2 = entityManager.create(AccountEntity, {
      serverURL: 'mastodon.social',
      isActive: true,
      setupComplete: true,
      owner: nonAdminUser,
      utcOffset: '+01:00',
      timezone: 'Europe/Berlin',
    });

    const account3 = entityManager.create(AccountEntity, {
      serverURL: 'mastodon.online',
      isActive: false,
      setupComplete: false,
      owner: user2,
      utcOffset: '+00:00',
      timezone: 'UTC',
    });

    await entityManager.persistAndFlush([account1, account2, account3]);
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(AccountEntity, {});
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

    it('should return correct counts matching seeded data', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      const { users, accounts } = response.body;

      // 3 users total: admin, user@example.com, user2@example.com
      expect(users.totalCount).toBe(3);
      // 2 active (admin + user@example.com), 1 inactive (user2)
      expect(users.activeCount).toBe(2);
      expect(users.inactiveCount).toBe(1);
      // 1 admin, 2 account owners
      expect(users.roleBreakdown.admin).toBe(1);
      expect(users.roleBreakdown.accountOwner).toBe(2);

      // 3 accounts total
      expect(accounts.totalCount).toBe(3);
      // 2 setup complete, 1 incomplete
      expect(accounts.setupCompleteCount).toBe(2);
      expect(accounts.setupIncompleteCount).toBe(1);
      // 2 active, 1 inactive
      expect(accounts.activeCount).toBe(2);
      expect(accounts.inactiveCount).toBe(1);

      // Server distribution: 2 on mastodon.social, 1 on mastodon.online
      expect(accounts.serverDistribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ serverURL: 'mastodon.social', count: 2 }),
          expect.objectContaining({ serverURL: 'mastodon.online', count: 1 }),
        ]),
      );
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
