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
import { ObjectId } from 'bson';
import * as request from 'supertest';

import { AccountsService } from '../../src/accounts/accounts.service';
import { AccountResponseDto } from '../../src/accounts/dto/account-response.dto';
import { CreateAccountDto } from '../../src/accounts/dto/create-account.dto';
import { UpdateAccountDto } from '../../src/accounts/dto/update-account.dto';
import { AppModule } from '../../src/app.module';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UsersService } from '../../src/users/users.service';

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;
  let usersService: UsersService;
  let accountsService: AccountsService;

  let testUser: UserEntity;
  let testUserAccessToken: string;

  const testUserData = {
    email: 'account-test-user@example.com',
    password: 'TestUserPassword123!',
    role: UserRole.AccountOwner,
    isActive: true,
    maxAccounts: 3, // For testing limits
  };

  const createAccountDto1: CreateAccountDto = {
    serverURL: 'https://mastodon.social',
    timezone: 'Europe/Berlin',
    name: 'Test Account 1',
  };

  const createAccountDto2: CreateAccountDto = {
    serverURL: 'https://mas.to',
    timezone: 'America/New York',
    name: 'Test Account 2',
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

    // Clear database and create test user
    await clearDatabase();
    testUser = await usersService.create(testUserData);
    testUser.emailVerified = true; // Assume user is verified for simplicity
    await entityManager.persistAndFlush(testUser);

    // Generate token for test user
    const payload = { sub: testUser.id, email: testUser.email, role: testUser.role };
    testUserAccessToken = jwtService.sign(payload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<string>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });
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

  beforeEach(async () => {
    // Clear accounts before each test, keep the testUser
    await entityManager.nativeDelete(AccountCredentialsEntity, {});
    await entityManager.nativeDelete(AccountEntity, { owner: testUser.id });

    entityManager.clear(); // Clear the identity map
    // Re-fetch testUser to ensure it's a fresh instance for the current test
    const userFromDb = await usersService.findById(testUser.id);
    if (userFromDb) testUser = userFromDb;

    // Ensure the accounts collection is refreshed
    await testUser.accounts.init();
  });

  describe('POST /accounts', () => {
    it('should create a new account successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .send(createAccountDto1)
        .expect(HttpStatus.CREATED);

      expect(response.body.serverURL).toBe(createAccountDto1.serverURL);
      expect(response.body.name).toBe(createAccountDto1.name);
      expect(response.body.timezone).toBe(createAccountDto1.timezone);
      expect(response.body.setupComplete).toBe(false);
      expect(response.body.isActive).toBe(true);

      const dbAccount = await entityManager.findOne(AccountEntity, {
        name: createAccountDto1.name,
        owner: testUser.id,
      });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount?.serverURL).toBe(createAccountDto1.serverURL);
      expect(dbAccount?.id).toBe(response.body.id);

      // Verify the account is in the user's accounts collection
      const updatedUser = await entityManager.findOneOrFail(
        UserEntity,
        { id: testUser.id },
        { populate: ['accounts'] },
      );
      expect(updatedUser.accounts.isInitialized()).toBe(true);
      // After beforeEach clears accounts, this should be the first one
      expect(updatedUser.accounts.count()).toBe(1);
      const foundInCollection = updatedUser.accounts.getItems().some((acc) => acc.id === response.body.id);
      expect(foundInCollection).toBe(true);
    });

    it('should fail to create account if not authenticated', async () => {
      await request(app.getHttpServer()).post('/accounts').send(createAccountDto1).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail with invalid input data (e.g., invalid serverURL)', async () => {
      const invalidData = { ...createAccountDto1, serverURL: 'not-a-url' };
      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail if user exceeds maxAccounts limit', async () => {
      // Create accounts up to the limit
      for (let i = 0; i < (testUserData.maxAccounts ?? 0); i++) {
        await accountsService.create({ ...createAccountDto1, name: `Limit Test Acc ${i}` }, testUser);
      }

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .send(createAccountDto2) // Attempt to create one more
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /accounts', () => {
    beforeEach(async () => {
      // Create some accounts for the testUser
      await accountsService.create(createAccountDto1, testUser);
      await accountsService.create(createAccountDto2, testUser);
    });

    it('should get all accounts for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body.some((acc: AccountResponseDto) => acc.name === createAccountDto1.name)).toBe(true);
      expect(response.body.some((acc: AccountResponseDto) => acc.name === createAccountDto2.name)).toBe(true);
    });

    it('should return an empty array if user has no accounts', async () => {
      // Clear accounts specifically for this test case
      await entityManager.nativeDelete(AccountEntity, { owner: testUser.id });

      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it('should fail if not authenticated', async () => {
      await request(app.getHttpServer()).get('/accounts').expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /accounts/:id', () => {
    let createdAccount: AccountEntity;

    beforeEach(async () => {
      createdAccount = await accountsService.create(createAccountDto1, testUser);
    });

    it('should get a specific account by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/accounts/${createdAccount.id}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(createdAccount.id);
      expect(response.body.name).toBe(createAccountDto1.name);
    });

    it('should return 403 if account not found or not owned by user', async () => {
      const nonExistentId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`/accounts/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail if not authenticated', async () => {
      await request(app.getHttpServer()).get(`/accounts/${createdAccount.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /accounts/:id', () => {
    let createdAccount: AccountEntity;
    const updateData: UpdateAccountDto = {
      name: 'Updated Account Name',
      timezone: 'Asia/Tokyo',
    };

    beforeEach(async () => {
      createdAccount = await accountsService.create(createAccountDto1, testUser);
    });

    it('should update an account successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/accounts/${createdAccount.id}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(createdAccount.id);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.timezone).toBe(updateData.timezone);

      const dbAccount = await entityManager.findOneOrFail(AccountEntity, { id: createdAccount.id });
      expect(dbAccount.name).toBe(updateData.name);
      expect(dbAccount.timezone).toBe(updateData.timezone);
    });

    it('should return 403 if account not found or not owned by user for update', async () => {
      const nonExistentId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .patch(`/accounts/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .send(updateData)
        .expect(HttpStatus.NOT_FOUND); // Service throws NotFoundException if account not found by ID for owner
    });

    it('should fail with invalid input data for update', async () => {
      const invalidUpdate = { timezone: 'Invalid/Timezone' };
      await request(app.getHttpServer())
        .patch(`/accounts/${createdAccount.id}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .send(invalidUpdate)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail if not authenticated', async () => {
      await request(app.getHttpServer())
        .patch(`/accounts/${createdAccount.id}`)
        .send(updateData)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /accounts/:id', () => {
    let createdAccount: AccountEntity;

    beforeEach(async () => {
      createdAccount = await accountsService.create(createAccountDto1, testUser);
    });

    it('should delete an account successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${createdAccount.id}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NO_CONTENT);

      const dbAccount = await entityManager.findOne(AccountEntity, { id: createdAccount.id });
      expect(dbAccount).toBeNull();
    });

    it('should return 404 if account not found or not owned by user for delete', async () => {
      const nonExistentId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .delete(`/accounts/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserAccessToken}`)
        .expect(HttpStatus.NOT_FOUND); // Service throws NotFoundException
    });

    it('should fail if not authenticated', async () => {
      await request(app.getHttpServer()).delete(`/accounts/${createdAccount.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
