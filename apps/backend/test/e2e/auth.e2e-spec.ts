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
import { TokenResponseDto } from '../../src/auth/dto/token-response.dto';
import { UserCredentialsEntity } from '../../src/auth/entities/user-credentials.entity';
import { authConstants } from '../../src/shared/constants/auth.constants';
import { UserRole } from '../../src/shared/enums/user-role.enum';
import { UserEntity } from '../../src/users/entities/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let entityManager: EntityManager;
  let orm: MikroORM;
  let jwtService: JwtService;
  let configService: ConfigService;

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
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  const clearDatabase = async () => {
    // Order matters due to foreign key constraints if they were enforced at DB level
    // or for logical cleanup. MikroORM handles this well, but explicit order is safer.
    await entityManager.nativeDelete(UserCredentialsEntity, {});
    await entityManager.nativeDelete(UserEntity, {});
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user and return tokens', async () => {
      const registerDto: RegisterUserDto = { ...testUser };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

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
    beforeEach(async () => {
      // Register a user to test login
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
    });

    it('should log in an existing user and return tokens', async () => {
      const loginDto: LoginDto = { email: testUser.email, password: testUser.password };

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      const dbUser = await entityManager.findOne(UserEntity, { email: testUser.email }, { populate: ['credentials'] });
      expect(dbUser?.credentials?.refreshToken).toBe(response.body.refreshToken);
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

    beforeEach(async () => {
      const registerResponse = await request(app.getHttpServer()).post('/auth/register').send(testUser);
      refreshToken = registerResponse.body.refreshToken;
    });

    it('should refresh tokens with a valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken); // New refresh token should be issued

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
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .then((res) => res.body as TokenResponseDto);
      accessToken = loginResponse.accessToken;
    });

    it('should get user profile with a valid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.email).toBe(testUser.email);
      expect(response.body.role).toBe(UserRole.AccountOwner);
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
    let accessToken: string;
    let initialRefreshToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send(testUser);
      accessToken = res.body.accessToken;
      initialRefreshToken = res.body.refreshToken;
    });

    it('should log out a user and invalidate refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
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
