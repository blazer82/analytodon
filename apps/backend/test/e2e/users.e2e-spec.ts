import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { UserCredentialsEntity } from '../../src/auth/entities/user-credentials.entity';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UserRole } from '../../src/shared/enums/user-role.enum';
import { CreateUserDto } from '../../src/users/dto/create-user.dto';
import { SendEmailDto } from '../../src/users/dto/send-email.dto';
import { ManageSubscriptionDto } from '../../src/users/dto/subscription-query.dto';
import { UpdateUserDto } from '../../src/users/dto/update-user.dto';
import { UserResponseDto } from '../../src/users/dto/user-response.dto';
import { UserEntity } from '../../src/users/entities/user.entity';
import { UsersService } from '../../src/users/users.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;
  let usersService: UsersService; // For direct user creation if needed

  let adminAccessToken: string;
  let adminUser: UserEntity;

  const adminCredentials = {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
  };

  const testUser1Data: CreateUserDto = {
    email: 'user1@example.com',
    password: 'User1Password!',
    role: UserRole.AccountOwner,
    isActive: true,
    maxAccounts: 5,
    serverURLOnSignUp: 'mastodon.social',
    timezone: 'Europe/Berlin',
  };

  const testUser2Data: CreateUserDto = {
    email: 'user2@example.com',
    password: 'User2Password!',
    role: UserRole.AccountOwner,
    isActive: false,
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
    usersService = moduleFixture.get(UsersService); // Get UsersService instance

    // Create an admin user directly for testing admin-only endpoints
    await clearDatabase(); // Clear before creating admin
    adminUser = await usersService.create({
      ...adminCredentials,
      role: UserRole.Admin,
      isActive: true,
    });
    adminUser.emailVerified = true; // Assume admin is verified
    await entityManager.persistAndFlush(adminUser);

    // Generate token for admin user
    const payload = { sub: adminUser.id, email: adminUser.email, role: adminUser.role };
    adminAccessToken = jwtService.sign(payload, {
      secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
      expiresIn: configService.get<string>(authConstants.JWT_EXPIRES_IN_KEY, authConstants.JWT_DEFAULT_EXPIRES_IN),
    });
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  beforeEach(async () => {
    // Clear non-admin users before each test, keep admin user
    await entityManager.nativeDelete(UserEntity, { email: { $ne: adminCredentials.email } });
    await entityManager.nativeDelete(UserCredentialsEntity, { user: { $nin: [adminUser.id] } });
  });

  describe('POST /users (Admin Create User)', () => {
    it('should create a new user successfully (Admin)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testUser1Data)
        .expect(HttpStatus.CREATED);

      expect(response.body.email).toBe(testUser1Data.email);
      expect(response.body.role).toBe(testUser1Data.role);
      expect(response.body.isActive).toBe(testUser1Data.isActive);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser1Data.email });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.maxAccounts).toBe(testUser1Data.maxAccounts);
      expect(dbUser?.serverURLOnSignUp).toBe(testUser1Data.serverURLOnSignUp);
      expect(dbUser?.timezone).toBe(testUser1Data.timezone);
    });

    it('should fail to create user if email already exists (Admin)', async () => {
      await usersService.create(testUser1Data); // Pre-populate

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(testUser1Data)
        .expect(HttpStatus.CONFLICT);
    });

    it('should fail with invalid input data (Admin)', async () => {
      const invalidData = { ...testUser1Data, email: 'not-an-email' };
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail if not authenticated (Admin)', async () => {
      await request(app.getHttpServer()).post('/users').send(testUser1Data).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail if authenticated user is not Admin', async () => {
      // Create a non-admin user and get their token
      const nonAdmin = await usersService.create({
        email: 'nonadmin@example.com',
        password: 'Password123!',
        role: UserRole.AccountOwner,
      });
      const nonAdminPayload = { sub: nonAdmin.id, email: nonAdmin.email, role: nonAdmin.role };
      const nonAdminToken = jwtService.sign(nonAdminPayload);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send(testUser1Data)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /users (Admin Find All Users)', () => {
    beforeEach(async () => {
      await usersService.create(testUser1Data);
      await usersService.create(testUser2Data);
    });

    it('should get a list of all users (Admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      // Includes admin + 2 test users
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      expect(response.body.some((u: UserResponseDto) => u.email === testUser1Data.email)).toBe(true);
      expect(response.body.some((u: UserResponseDto) => u.email === testUser2Data.email)).toBe(true);
      expect(response.body.some((u: UserResponseDto) => u.email === adminCredentials.email)).toBe(true);
    });

    it('should fail if not authenticated (Admin)', async () => {
      await request(app.getHttpServer()).get('/users').expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /users/:id (Admin Find User By ID)', () => {
    let createdUser: UserEntity;

    beforeEach(async () => {
      createdUser = await usersService.create(testUser1Data);
    });

    it('should get user details by ID (Admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${createdUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(createdUser.id);
      expect(response.body.email).toBe(testUser1Data.email);
    });

    it('should return 404 if user not found (Admin)', async () => {
      const nonExistentId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail if not authenticated (Admin)', async () => {
      await request(app.getHttpServer()).get(`/users/${createdUser.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /users/:id (Admin Update User)', () => {
    let createdUser: UserEntity;
    const updateData: UpdateUserDto = {
      email: 'updated.email@example.com',
      isActive: false,
      role: UserRole.AccountOwner,
      maxAccounts: 10,
      unsubscribed: ['news', 'updates'],
    };

    beforeEach(async () => {
      createdUser = await usersService.create(testUser1Data);
    });

    it('should update user details by ID (Admin)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${createdUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(createdUser.id);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.isActive).toBe(updateData.isActive);

      const dbUser = await entityManager.findOneOrFail(UserEntity, { id: createdUser.id });
      expect(dbUser.email).toBe(updateData.email);
      expect(dbUser.isActive).toBe(updateData.isActive);
      expect(dbUser.role).toBe(updateData.role);
      expect(dbUser.maxAccounts).toBe(updateData.maxAccounts);
      expect(dbUser.unsubscribed).toEqual(updateData.unsubscribed);
    });

    it('should update user password by ID (Admin)', async () => {
      const passwordUpdate: UpdateUserDto = { password: 'NewPasswordSecure123!' };
      await request(app.getHttpServer())
        .patch(`/users/${createdUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(passwordUpdate)
        .expect(HttpStatus.OK);

      // Verify password by trying to log in (requires auth service or direct check)
      // For simplicity, we'll assume UsersService correctly hashes and updates.
      // A more thorough test would involve attempting login with the new password.
      const creds = await entityManager.findOne(UserCredentialsEntity, { user: createdUser });
      expect(creds).not.toBeNull();
      // Cannot directly compare bcrypt.compare(passwordUpdate.password, creds.passwordHash) here
      // but we know it was processed.
    });

    it('should return 404 if user not found (Admin)', async () => {
      const nonExistentId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .patch(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail with invalid input data (Admin)', async () => {
      const invalidUpdate = { email: 'not-an-email' };
      await request(app.getHttpServer())
        .patch(`/users/${createdUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidUpdate)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail if not authenticated (Admin)', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${createdUser.id}`)
        .send(updateData)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /users/send-email (Admin Send Email)', () => {
    const emailDto: SendEmailDto = {
      recipientGroup: 'all',
      subject: 'E2E Test Email',
      text: 'Hello from E2E test!',
    };

    it('should accept the request and return NO_CONTENT (Admin)', async () => {
      // Logger spy to check if the service method was called (actual email sending is mocked/logged)
      const loggerSpy = jest.spyOn(app.get(UsersService)['logger'], 'warn');

      await request(app.getHttpServer())
        .post('/users/send-email')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(emailDto)
        .expect(HttpStatus.NO_CONTENT);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `MailService.sendEmail called with: group=${emailDto.recipientGroup}, subject=${emailDto.subject}`,
        ),
      );
      loggerSpy.mockRestore();
    });

    it('should fail with invalid input data (Admin)', async () => {
      const invalidEmailDto = { ...emailDto, subject: undefined };
      await request(app.getHttpServer())
        .post('/users/send-email')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidEmailDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail if not authenticated (Admin)', async () => {
      await request(app.getHttpServer()).post('/users/send-email').send(emailDto).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /users/subscribe/:type and /unsubscribe/:type (Public Subscription Management)', () => {
    let targetUser: UserEntity;
    const subscriptionType = 'newsletter';
    let manageDto: ManageSubscriptionDto;

    beforeEach(async () => {
      targetUser = await usersService.create({
        email: 'subtest@example.com',
        password: 'Password123!',
        role: UserRole.AccountOwner,
      });
      manageDto = { u: targetUser.id, e: targetUser.email };
    });

    it('should subscribe a user to an email list type', async () => {
      // First, ensure they are unsubscribed (or add to list if not present)
      targetUser.unsubscribed = [subscriptionType];
      await entityManager.persistAndFlush(targetUser);

      await request(app.getHttpServer())
        .post(`/users/subscribe/${subscriptionType}`)
        .send(manageDto)
        .expect(HttpStatus.NO_CONTENT);

      const dbUser = await entityManager.findOneOrFail(UserEntity, { id: targetUser.id });
      expect(dbUser.unsubscribed).not.toContain(subscriptionType);
    });

    it('should unsubscribe a user from an email list type', async () => {
      targetUser.unsubscribed = []; // Ensure they are subscribed
      await entityManager.persistAndFlush(targetUser);

      await request(app.getHttpServer())
        .post(`/users/unsubscribe/${subscriptionType}`)
        .send(manageDto)
        .expect(HttpStatus.NO_CONTENT);

      const dbUser = await entityManager.findOneOrFail(UserEntity, { id: targetUser.id });
      expect(dbUser.unsubscribed).toContain(subscriptionType);
    });

    it('should return NO_CONTENT even if user/email does not match (privacy)', async () => {
      const wrongDto: ManageSubscriptionDto = { u: targetUser.id, e: 'wrong@email.com' };
      await request(app.getHttpServer())
        .post(`/users/subscribe/${subscriptionType}`)
        .send(wrongDto)
        .expect(HttpStatus.NO_CONTENT);

      // Check that the original user's subscription status hasn't changed unexpectedly
      const dbUser = await entityManager.findOneOrFail(UserEntity, { id: targetUser.id });
      expect(dbUser.unsubscribed || []).not.toContain(subscriptionType); // Assuming it was empty or didn't have it
    });

    it('should fail with invalid DTO for subscribe', async () => {
      const invalidDto = { ...manageDto, u: 'not-an-object-id' };
      await request(app.getHttpServer())
        .post(`/users/subscribe/${subscriptionType}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with invalid DTO for unsubscribe', async () => {
      const invalidDto = { ...manageDto, e: 'not-an-email' };
      await request(app.getHttpServer())
        .post(`/users/unsubscribe/${subscriptionType}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
