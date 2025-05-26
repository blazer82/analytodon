import { AccountEntity, UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { RegisterUserDto } from '../../src/auth/dto/register-user.dto';
import { ResetPasswordDto } from '../../src/auth/dto/reset-password.dto';
import { MailService } from '../../src/mail/mail.service';
import { authConstants } from '../../src/shared/constants/auth.constants';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockMailService = {
    sendEmailVerificationMail: jest.fn().mockResolvedValue(undefined),
    sendSignupNotificationMail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    // Add other MailService methods here if they get called during E2E tests
  };

  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    serverURLOnSignUp: 'mastodon.social',
    timezone: 'Europe/Berlin',
  };

  const secondUser = {
    email: 'test2@example.com',
    password: 'Password456!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

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
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    // Order matters due to foreign key constraints if they were enforced at DB level
    // or for logical cleanup. MikroORM handles this well, but explicit order is safer.
    // Delete entities that might have foreign keys to UserEntity or AccountEntity first.
    await entityManager.nativeDelete(AccountEntity, {}); // Accounts might reference Users
    await entityManager.nativeDelete(UserCredentialsEntity, {}); // UserCredentials reference Users
    await entityManager.nativeDelete(UserEntity, {});
  };

  const createTestAccount = async (user: UserEntity, em: EntityManager): Promise<AccountEntity> => {
    const accountData = {
      owner: user,
      serverURL: 'mastodon.test',
      name: 'Test Account',
      username: 'testuser',
      accountName: '@testuser@mastodon.test',
      accountURL: 'https://mastodon.test/@testuser',
      avatarURL: 'https://mastodon.test/avatar.png',
      isActive: true,
      setupComplete: true,
      timezone: 'America/New_York',
      utcOffset: '-04:00',
    };
    const account = em.create(AccountEntity, accountData);
    await em.persistAndFlush(account);
    return account;
  };

  beforeEach(async () => {
    await clearDatabase();
    // Clear mock calls before each test
    mockMailService.sendEmailVerificationMail.mockClear();
    mockMailService.sendSignupNotificationMail.mockClear();
    mockMailService.sendPasswordResetEmail.mockClear();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user and return tokens', async () => {
      const registerDto: RegisterUserDto = { ...testUser };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(testUser.email);
      expect(dbUser?.role).toBe(UserRole.AccountOwner);
      expect(dbUser?.emailVerified).toBe(false);
      expect(dbUser?.emailVerificationCode).toBeDefined();
      expect(dbUser?.serverURLOnSignUp).toBe(testUser.serverURLOnSignUp);
      expect(dbUser?.timezone).toBe(testUser.timezone);

      const dbCredentials = await entityManager.findOne(UserCredentialsEntity, { user: dbUser?.id });
      expect(dbCredentials).not.toBeNull();
      expect(dbCredentials?.refreshToken).toBe(response.body.refreshToken);
    });

    it('should fail to register if email already exists', async () => {
      // First registration
      await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(HttpStatus.CREATED);

      // Attempt to register again with the same email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, password: 'NewPassword123!' })
        .expect(HttpStatus.CONFLICT);
    });

    it('should fail with invalid input data (e.g., short password)', async () => {
      const registerDto: RegisterUserDto = { email: 'invalid@example.com', password: 'short' };
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/auth/login (POST)', () => {
    let testAccount: AccountEntity;

    beforeEach(async () => {
      // Register a user to test login
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
      const registeredUser = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      testAccount = await createTestAccount(registeredUser, entityManager);
    });

    it('should log in an existing user and return tokens with populated account data', async () => {
      const loginDto: LoginDto = { email: testUser.email, password: testUser.password };

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.accounts).toBeInstanceOf(Array);
      expect(response.body.user.accounts.length).toBe(1);

      const accountDto = response.body.user.accounts[0];
      expect(accountDto._id).toBe(testAccount.id);
      expect(accountDto.serverURL).toBe(testAccount.serverURL);
      expect(accountDto.name).toBe(testAccount.name);
      expect(accountDto.username).toBe(testAccount.username);
      expect(accountDto.accountName).toBe(testAccount.accountName);
      expect(accountDto.accountURL).toBe(testAccount.accountURL);
      expect(accountDto.avatarURL).toBe(testAccount.avatarURL);
      expect(accountDto.timezone).toBe(testAccount.timezone);
      expect(accountDto.utcOffset).toBe(testAccount.utcOffset);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email }, { populate: ['credentials'] });
      expect(dbUser?.credentials?.refreshToken).toBe(response.body.refreshToken);
    });

    it('should log in and not include accounts that are not setupComplete', async () => {
      // Create another account that is not setupComplete
      const registeredUser = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      const incompleteAccount = entityManager.create(AccountEntity, {
        owner: registeredUser,
        serverURL: 'incomplete.test',
        isActive: true,
        setupComplete: false, // Key difference
        timezone: 'Europe/London',
        utcOffset: '+00:00',
      });
      await entityManager.persistAndFlush(incompleteAccount);

      const loginDto: LoginDto = { email: testUser.email, password: testUser.password };
      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.OK);

      expect(response.body.user.accounts).toBeInstanceOf(Array);
      expect(response.body.user.accounts.length).toBe(1); // Still 1, because only setupComplete accounts are included
      expect(response.body.user.accounts[0]._id).toBe(testAccount.id); // Ensure it's the correct account
    });

    it('should fail to log in with incorrect password', async () => {
      const loginDto: LoginDto = { email: testUser.email, password: 'WrongPassword!' };
      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail to log in with non-existent email', async () => {
      const loginDto: LoginDto = { email: 'nonexistent@example.com', password: 'Password123!' };
      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshToken: string;
    let testAccount: AccountEntity;

    beforeEach(async () => {
      const registerResponse = await request(app.getHttpServer()).post('/auth/register').send(testUser);
      refreshToken = registerResponse.body.refreshToken;
      const registeredUser = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      testAccount = await createTestAccount(registeredUser, entityManager);
    });

    it('should refresh tokens with a valid refresh token and include populated account data', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.refreshToken).not.toBe(refreshToken); // New refresh token should be issued

      expect(response.body.user.accounts).toBeInstanceOf(Array);
      expect(response.body.user.accounts.length).toBe(1);

      const accountDto = response.body.user.accounts[0];
      expect(accountDto._id).toBe(testAccount.id);
      expect(accountDto.serverURL).toBe(testAccount.serverURL);
      expect(accountDto.name).toBe(testAccount.name);
      expect(accountDto.username).toBe(testAccount.username);
      expect(accountDto.accountName).toBe(testAccount.accountName);
      expect(accountDto.accountURL).toBe(testAccount.accountURL);
      expect(accountDto.avatarURL).toBe(testAccount.avatarURL);
      expect(accountDto.timezone).toBe(testAccount.timezone);
      expect(accountDto.utcOffset).toBe(testAccount.utcOffset);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email }, { populate: ['credentials'] });
      expect(dbUser?.credentials?.refreshToken).toBe(response.body.refreshToken);
    });

    it('should fail to refresh with an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail if user is inactive', async () => {
      const user = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      user.isActive = false;
      await entityManager.persistAndFlush(user);

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/auth/profile (GET)', () => {
    let userToken: string;
    let registeredUserEntity: UserEntity;
    let testAccount: AccountEntity;

    beforeEach(async () => {
      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(HttpStatus.CREATED);
      userToken = registerResponse.body.token;

      // Fetch the registered user to create an account for them
      registeredUserEntity = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      // Create an account for this user
      testAccount = await createTestAccount(registeredUserEntity, entityManager);
    });

    it('should get user profile with a valid access token and populated accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(response.body._id).toBe(registeredUserEntity.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.role).toBe(UserRole.AccountOwner);
      expect(response.body.emailVerified).toBe(false); // As per registration default
      expect(response.body.serverURLOnSignUp).toBe(testUser.serverURLOnSignUp);
      expect(response.body.timezone).toBe(testUser.timezone);

      expect(response.body.accounts).toBeInstanceOf(Array);
      expect(response.body.accounts.length).toBe(1);

      const accountDto = response.body.accounts[0];
      expect(accountDto._id).toBe(testAccount.id);
      expect(accountDto.serverURL).toBe(testAccount.serverURL);
      expect(accountDto.name).toBe(testAccount.name);
      // Add other SessionAccountDto assertions as needed
    });

    it('should get user profile and not include accounts that are not setupComplete', async () => {
      // Create another account for the same user that is not setupComplete
      const incompleteAccount = entityManager.create(AccountEntity, {
        owner: registeredUserEntity,
        serverURL: 'incomplete.test',
        isActive: true,
        setupComplete: false, // Key difference
        timezone: 'Europe/London',
        utcOffset: '+00:00',
      });
      await entityManager.persistAndFlush(incompleteAccount);

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.accounts).toBeInstanceOf(Array);
      expect(response.body.accounts.length).toBe(1); // Still 1, because only setupComplete accounts are included
      expect(response.body.accounts[0]._id).toBe(testAccount.id); // Ensure it's the correct, complete account
    });

    it('should fail to get profile without an access token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail to get profile with an invalid/expired access token', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'some-id', email: testUser.email, role: UserRole.AccountOwner },
        {
          secret: configService.get<string>(authConstants.JWT_SECRET_KEY, authConstants.JWT_DEFAULT_SECRET),
          expiresIn: '0s', //-1s
        },
      );
      // Wait for token to actually expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/auth/logout (POST)', () => {
    let userToken: string;
    let initialRefreshToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send(testUser);
      userToken = res.body.token;
      initialRefreshToken = res.body.refreshToken;
    });

    it('should log out a user and invalidate refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.NO_CONTENT);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email }, { populate: ['credentials'] });
      expect(dbUser?.credentials?.refreshToken).toBeUndefined();

      // Attempt to use the old refresh token should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should require authentication to logout', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/auth/request-password-reset (POST)', () => {
    beforeEach(async () => {
      // Register and verify user
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
      const user = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      user.emailVerified = true;
      await entityManager.persistAndFlush(user);
    });

    it('should request password reset for an existing, verified user', async () => {
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: testUser.email })
        .expect(HttpStatus.NO_CONTENT);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email });
      expect(dbUser?.resetPasswordToken).toBeDefined();
      expect(dbUser?.resetPasswordToken).not.toBeNull();
    });

    it('should return NO_CONTENT even if user does not exist for security reasons', async () => {
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(HttpStatus.NO_CONTENT);
    });

    it('should return NO_CONTENT if user is not verified, but not send token', async () => {
      await clearDatabase(); // clear user from beforeEach
      await request(app.getHttpServer()).post('/auth/register').send(secondUser); // secondUser is not verified

      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: secondUser.email })
        .expect(HttpStatus.NO_CONTENT);

      const dbUser = await entityManager.findOne(UserEntity, { email: secondUser.email });
      expect(dbUser?.resetPasswordToken).toBeUndefined();
    });
  });

  describe('/auth/reset-password (POST)', () => {
    let resetToken: string;

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
      const user = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      user.emailVerified = true; // Assume user is verified
      user.resetPasswordToken = 'valid-reset-token'; // Simulate token generation
      await entityManager.persistAndFlush(user);
      resetToken = user.resetPasswordToken;
    });

    it('should reset password with a valid token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: resetToken,
        password: 'NewSecurePassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(HttpStatus.NO_CONTENT);

      entityManager.clear(); // Clear identity map to ensure fresh data from DB
      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email }, { populate: ['credentials'] });
      expect(dbUser?.resetPasswordToken).toBeUndefined();

      // Verify new password by trying to log in
      const loginDto: LoginDto = { email: testUser.email, password: resetPasswordDto.password };
      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.OK);
    });

    it('should fail to reset password with an invalid token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid-token',
        password: 'NewSecurePassword123!',
      };
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetPasswordDto)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('/auth/verify-email (GET)', () => {
    let verificationCode: string;

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
      const user = await entityManager.findOneOrFail(UserEntity, { email: testUser.email });
      expect(user.emailVerified).toBe(false); // Ensure user is not verified initially
      verificationCode = user.emailVerificationCode!;
    });

    it('should verify email with a valid verification code', async () => {
      await request(app.getHttpServer())
        .get(`/auth/verify-email?code=${verificationCode}`)
        .expect(HttpStatus.NO_CONTENT);

      entityManager.clear(); // Clear identity map to ensure fresh data from DB
      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email });
      expect(dbUser?.emailVerified).toBe(true);
      expect(dbUser?.emailVerificationCode).toBeUndefined();
    });

    it('should fail to verify email with an invalid code', async () => {
      await request(app.getHttpServer()).get('/auth/verify-email?code=invalid-code').expect(HttpStatus.NOT_FOUND);

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email });
      expect(dbUser?.emailVerified).toBe(false); // Should remain unverified
    });
  });
});
