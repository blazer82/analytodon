import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { FirstStatsMailDto } from '../../src/mail/dto/first-stats-mail.dto';
import { OldAccountMailDto } from '../../src/mail/dto/old-account-mail.dto';
import { WeeklyStatsMailDto } from '../../src/mail/dto/weekly-stats-mail.dto';
import { MailService } from '../../src/mail/mail.service';

describe('MailController (e2e)', () => {
  let app: INestApplication;
  let mockMailService: jest.Mocked<MailService>;
  let configService: ConfigService;
  let apiKey: string;

  // Use a real MailService type for the mock object but provide mock implementations
  const mailServiceMethods = {
    processAndSendFirstStatsAvailableMail: jest.fn().mockResolvedValue(undefined),
    processAndSendWeeklyStatsMail: jest.fn().mockResolvedValue(undefined),
    processAndSendOldAccountWarningMail: jest.fn().mockResolvedValue(undefined),
    // Add any other methods of MailService that might be called indirectly or need mocking
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mailServiceMethods)
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

    // Get the mock instance correctly after overriding
    mockMailService = moduleFixture.get(MailService);
    configService = moduleFixture.get(ConfigService);
    apiKey = configService.get<string>('EMAIL_API_KEY');
    if (!apiKey) {
      throw new Error(
        'EMAIL_API_KEY not found in config for e2e tests. Please ensure it is set in your .env.test or equivalent.',
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Clear mock calls before each test
    mockMailService.processAndSendFirstStatsAvailableMail.mockClear();
    mockMailService.processAndSendWeeklyStatsMail.mockClear();
    mockMailService.processAndSendOldAccountWarningMail.mockClear();
  });

  const validUserId = new ObjectId().toHexString();
  const validAccountId1 = new ObjectId().toHexString();
  const validAccountId2 = new ObjectId().toHexString();

  describe('/mail/first-stats (POST)', () => {
    const firstStatsPath = '/mail/first-stats';
    const validDto: FirstStatsMailDto = {
      userID: validUserId,
      accounts: [validAccountId1, validAccountId2],
    };

    it('should accept the request with valid API key and DTO', async () => {
      await request(app.getHttpServer())
        .post(firstStatsPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(validDto)
        .expect(HttpStatus.ACCEPTED);

      expect(mockMailService.processAndSendFirstStatsAvailableMail).toHaveBeenCalledWith(validDto);
    });

    it('should accept the request with valid API key (without Bearer) and DTO', async () => {
      await request(app.getHttpServer())
        .post(firstStatsPath)
        .set('Authorization', apiKey)
        .send(validDto)
        .expect(HttpStatus.ACCEPTED);

      expect(mockMailService.processAndSendFirstStatsAvailableMail).toHaveBeenCalledWith(validDto);
    });

    it('should reject with Unauthorized if API key is missing', async () => {
      await request(app.getHttpServer()).post(firstStatsPath).send(validDto).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject with Unauthorized if API key is invalid', async () => {
      await request(app.getHttpServer())
        .post(firstStatsPath)
        .set('Authorization', 'Bearer invalidapikey')
        .send(validDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject with Bad Request if DTO is invalid (e.g., missing userID)', async () => {
      const invalidDto = { ...validDto, userID: undefined };
      await request(app.getHttpServer())
        .post(firstStatsPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject with Bad Request if DTO has invalid account ID', async () => {
      const invalidDto: FirstStatsMailDto = { userID: validUserId, accounts: ['invalid-id'] };
      await request(app.getHttpServer())
        .post(firstStatsPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/mail/weekly-stats (POST)', () => {
    const weeklyStatsPath = '/mail/weekly-stats';
    const validDto: WeeklyStatsMailDto = {
      userID: validUserId,
      accounts: [validAccountId1],
    };

    it('should accept the request with valid API key and DTO', async () => {
      await request(app.getHttpServer())
        .post(weeklyStatsPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(validDto)
        .expect(HttpStatus.ACCEPTED);

      expect(mockMailService.processAndSendWeeklyStatsMail).toHaveBeenCalledWith(validDto);
    });

    it('should accept the request with valid API key, DTO, and optional email', async () => {
      const dtoWithEmail: WeeklyStatsMailDto = { ...validDto, email: 'test@example.com' };
      await request(app.getHttpServer())
        .post(weeklyStatsPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(dtoWithEmail)
        .expect(HttpStatus.ACCEPTED);

      expect(mockMailService.processAndSendWeeklyStatsMail).toHaveBeenCalledWith(dtoWithEmail);
    });

    it('should reject with Unauthorized if API key is missing', async () => {
      await request(app.getHttpServer()).post(weeklyStatsPath).send(validDto).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject with Bad Request if DTO is invalid (e.g., accounts is not an array)', async () => {
      const invalidDto = { ...validDto, accounts: 'not-an-array' };
      await request(app.getHttpServer())
        .post(weeklyStatsPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/mail/old-account (POST)', () => {
    const oldAccountPath = '/mail/old-account';
    const validDto: OldAccountMailDto = {
      userID: validUserId,
    };

    it('should accept the request with valid API key and DTO', async () => {
      await request(app.getHttpServer())
        .post(oldAccountPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(validDto)
        .expect(HttpStatus.ACCEPTED);

      expect(mockMailService.processAndSendOldAccountWarningMail).toHaveBeenCalledWith(validDto);
    });

    it('should reject with Unauthorized if API key is missing', async () => {
      await request(app.getHttpServer()).post(oldAccountPath).send(validDto).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject with Bad Request if DTO is invalid (e.g., userID is not a MongoId)', async () => {
      const invalidDto = { userID: 'not-a-mongo-id' };
      await request(app.getHttpServer())
        .post(oldAccountPath)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
