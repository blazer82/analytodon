import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let mailerService: jest.Mocked<MailerService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
  } as UserEntity;

  const mockAccount = {
    id: 'account-id-456',
    accountName: 'Test Account',
    name: 'TestAcc', // Fallback if accountName is not set
  } as AccountEntity;

  const mockConfigValues = {
    FRONTEND_URL: 'http://localhost:3000',
    EMAIL_FROM_ADDRESS: 'noreply@example.com',
    MARKETING_URL: 'http://marketing.example.com',
    EMAIL_FROM_NAME: 'Test App',
  };

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear mocks before each test

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key in mockConfigValues) {
                return mockConfigValues[key as keyof typeof mockConfigValues];
              }
              throw new Error(`Config key ${key} not found`);
            }),
            get: jest.fn(), // For non-essential configs if any
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get(MailerService);

    // Setup spies for logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCommonContext', () => {
    it('should return common context variables', () => {
      // Access private method for testing purpose
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commonContext = (service as any).getCommonContext();
      expect(commonContext).toEqual({
        appURL: mockConfigValues.FRONTEND_URL,
        supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
        marketingURL: mockConfigValues.MARKETING_URL,
        emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    const token = 'reset-token-123';
    const subject = 'Reset your Analytodon password!';

    it('should send a password reset email successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendPasswordResetEmail(mockUser, token);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './password-reset',
        context: {
          appURL: mockConfigValues.FRONTEND_URL,
          supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
          marketingURL: mockConfigValues.MARKETING_URL,
          emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
          resetLink: `${mockConfigValues.FRONTEND_URL}/reset-password?t=${token}`,
          subject,
        },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(`Password reset email sent to ${mockUser.email}`);
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendPasswordResetEmail(mockUser, token)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send password reset email to ${mockUser.email}`,
        error.stack,
      );
    });
  });

  describe('sendEmailVerificationMail', () => {
    const verificationCode = 'verify-code-456';
    const subject = 'Welcome to Analytodon - Please verify your email address';

    it('should send an email verification mail successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendEmailVerificationMail(mockUser, verificationCode);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './email-verification',
        context: {
          appURL: mockConfigValues.FRONTEND_URL,
          supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
          marketingURL: mockConfigValues.MARKETING_URL,
          emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
          verificationLink: `${mockConfigValues.FRONTEND_URL}/register/verify?c=${verificationCode}`,
          subject,
        },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(`Email verification mail sent to ${mockUser.email}`);
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendEmailVerificationMail(mockUser, verificationCode)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send email verification mail to ${mockUser.email}`,
        error.stack,
      );
    });
  });

  describe('sendOldAccountWarningMail', () => {
    const subject = "You haven't been on Analytodon in a while - we'll be deleting your data soon!";
    it('should send an old account warning mail successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendOldAccountWarningMail(mockUser);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './old-account-warning',
        context: {
          appURL: mockConfigValues.FRONTEND_URL,
          supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
          marketingURL: mockConfigValues.MARKETING_URL,
          emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
          subject,
        },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(`Old account warning mail sent to ${mockUser.email}`);
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendOldAccountWarningMail(mockUser)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error while sending old account warning mail to ${mockUser.email}`,
        error.stack,
      );
    });
  });

  describe('sendFirstStatsAvailableMail', () => {
    const subject = 'Your Mastodon analytics data is ready on Analytodon! 🎉';
    it('should send a first stats available mail successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendFirstStatsAvailableMail(mockUser, mockAccount);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './first-stats-available',
        context: {
          appURL: mockConfigValues.FRONTEND_URL,
          supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
          marketingURL: mockConfigValues.MARKETING_URL,
          emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
          accountName: mockAccount.accountName,
          subject,
        },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `First stats available mail sent to ${mockUser.email} for account ${mockAccount.accountName}`,
      );
    });

    it('should use account.name if account.accountName is not available', async () => {
      const accountWithoutAccountName = { ...mockAccount, accountName: undefined } as AccountEntity;
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendFirstStatsAvailableMail(mockUser, accountWithoutAccountName);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            accountName: mockAccount.name, // Fallback to name
          }),
        }),
      );
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendFirstStatsAvailableMail(mockUser, mockAccount)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error while sending first stats available mail to ${mockUser.email}`,
        error.stack,
      );
    });
  });

  describe('sendSignupNotificationMail', () => {
    const subject = 'Analytodon: New Sign Up';
    it('should send a signup notification mail to admin successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendSignupNotificationMail(mockUser);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockConfigValues.EMAIL_FROM_ADDRESS, // Admin email
        subject,
        template: './signup-notification',
        context: {
          appURL: mockConfigValues.FRONTEND_URL,
          supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
          marketingURL: mockConfigValues.MARKETING_URL,
          emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
          userEmail: mockUser.email,
          subject,
        },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(`Sign up notification mail sent to admin for user ${mockUser.email}`);
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendSignupNotificationMail(mockUser)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error while sending sign up notification mail for ${mockUser.email}`,
        error.stack,
      );
    });
  });

  describe('sendWeeklyStatsMail', () => {
    const subject = 'Your Week on Mastodon';
    const mockStats = [
      {
        accountName: 'Account1',
        followers: { value: 10, change: '+2' },
        replies: { value: 5, change: '-1' },
        boosts: { value: 20, change: '+5' },
        favorites: { value: 15, change: '0' },
      },
    ];

    it('should send a weekly stats mail successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendWeeklyStatsMail(mockUser, mockStats);
      const unsubscribeURL = `${mockConfigValues.FRONTEND_URL}/unsubscribe/weekly?u=${encodeURIComponent(mockUser.id)}&e=${encodeURIComponent(mockUser.email)}`;

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './weekly-stats',
        context: {
          appURL: mockConfigValues.FRONTEND_URL,
          supportEmail: mockConfigValues.EMAIL_FROM_ADDRESS,
          marketingURL: mockConfigValues.MARKETING_URL,
          emailSenderName: mockConfigValues.EMAIL_FROM_NAME,
          stats: mockStats,
          unsubscribeURL,
          subject,
        },
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(`Weekly stats mail sent to ${mockUser.email}`);
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendWeeklyStatsMail(mockUser, mockStats)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error while sending weekly stats mail to ${mockUser.email}`,
        error.stack,
      );
    });
  });

  describe('sendGenericPlainTextEmail', () => {
    const to = 'recipient@example.com';
    const subject = 'Generic Subject';
    const textBody = 'This is a generic email body.';

    it('should send a generic plain text email successfully', async () => {
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendGenericPlainTextEmail(to, subject, textBody);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to,
        subject,
        text: textBody,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(`Generic plain text email sent to ${to} with subject "${subject}"`);
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendGenericPlainTextEmail(to, subject, textBody)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send generic plain text email to ${to} with subject "${subject}"`,
        error.stack,
      );
    });
  });
});
