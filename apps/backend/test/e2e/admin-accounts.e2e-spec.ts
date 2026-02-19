import {
  AccountCredentialsEntity,
  AccountEntity,
  UserCredentialsEntity,
  UserEntity,
  UserRole,
} from '@analytodon/shared-orm';
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

describe('Admin Accounts (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;
  let usersService: UsersService;

  let adminAccessToken: string;
  let nonAdminAccessToken: string;
  let adminUser: UserEntity;
  let regularUser: UserEntity;
  let account1: AccountEntity;
  let account2: AccountEntity;

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
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: UserRole.Admin,
      isActive: true,
    });
    adminUser.emailVerified = true;
    await entityManager.persistAndFlush(adminUser);

    const adminPayload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
    adminAccessToken = jwtService.sign(adminPayload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<StringValue>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });

    // Create non-admin user
    regularUser = await usersService.create({
      email: 'user@example.com',
      password: 'UserPassword123!',
      role: UserRole.AccountOwner,
      isActive: true,
    });
    regularUser.emailVerified = true;
    await entityManager.persistAndFlush(regularUser);

    const nonAdminPayload = { sub: regularUser.id, email: regularUser.email, role: regularUser.role };
    nonAdminAccessToken = jwtService.sign(nonAdminPayload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<StringValue>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });

    // Create accounts owned by the regular user
    account1 = entityManager.create(AccountEntity, {
      serverURL: 'https://mastodon.social',
      name: 'Test Account',
      accountName: '@test@mastodon.social',
      username: 'test',
      isActive: true,
      setupComplete: true,
      owner: regularUser,
      utcOffset: '+00:00',
      timezone: 'UTC',
    });

    account2 = entityManager.create(AccountEntity, {
      serverURL: 'https://mastodon.online',
      name: 'Incomplete Account',
      isActive: false,
      setupComplete: false,
      owner: regularUser,
      utcOffset: '+01:00',
      timezone: 'Europe/Berlin',
    });

    await entityManager.persistAndFlush([account1, account2]);
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(AccountCredentialsEntity, {});
    await entityManager.nativeDelete(AccountEntity, {});
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  describe('GET /admin/accounts/browse', () => {
    it('should return 200 with paginated accounts for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/accounts/browse')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should return accounts with owner info', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/accounts/browse')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      const item = response.body.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('serverURL');
      expect(item).toHaveProperty('isActive');
      expect(item).toHaveProperty('setupComplete');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('owner');
      expect(item.owner).toHaveProperty('id');
      expect(item.owner).toHaveProperty('email');
    });

    it('should filter by isActive', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/accounts/browse?isActive=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      for (const item of response.body.items) {
        expect(item.isActive).toBe(true);
      }
    });

    it('should filter by setupComplete', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/accounts/browse?setupComplete=false')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      for (const item of response.body.items) {
        expect(item.setupComplete).toBe(false);
      }
    });

    it('should search by server URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/accounts/browse?search=mastodon.social')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.items.some((item: { serverURL: string }) => item.serverURL.includes('mastodon.social')),
      ).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/admin/accounts/browse').expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/accounts/browse')
        .set('Authorization', `Bearer ${nonAdminAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /admin/accounts/browse/:accountId', () => {
    it('should return 200 with account detail for admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/accounts/browse/${account1.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(account1.id);
      expect(response.body.serverURL).toBe('https://mastodon.social');
      expect(response.body.owner.email).toBe('user@example.com');
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .get('/admin/accounts/browse/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get(`/admin/accounts/browse/${account1.id}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get(`/admin/accounts/browse/${account1.id}`)
        .set('Authorization', `Bearer ${nonAdminAccessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Admin GET access to account-scoped endpoints', () => {
    it('should allow admin to GET followers KPI for non-owned account', async () => {
      // This endpoint requires AccountOwnerGuard - admin should be able to read
      const response = await request(app.getHttpServer())
        .get(`/accounts/${account1.id}/followers/kpi/weekly`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Should not be 403 or 404 (owner check). Could be 200 with data or some other status
      // depending on whether data exists, but NOT 403/404 from owner guard
      expect(response.status).not.toBe(HttpStatus.FORBIDDEN);
    });

    it('should deny admin POST to non-owned account connect', async () => {
      const response = await request(app.getHttpServer())
        .post(`/accounts/${account1.id}/connect`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      // Should be 404 (not owned) since POST is not allowed for non-owned accounts
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
