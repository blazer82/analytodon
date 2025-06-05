import * as fs from 'fs';
import * as path from 'path';

import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { BoostsService } from '../boosts/boosts.service';
import { FavoritesService } from '../favorites/favorites.service';
import { FollowersService } from '../followers/followers.service';
import { RepliesService } from '../replies/replies.service';
import { UsersService } from '../users/users.service';
import { FirstStatsMailDto } from './dto/first-stats-mail.dto';
import { OldAccountMailDto } from './dto/old-account-mail.dto';
import { WeeklyStatsMailDto } from './dto/weekly-stats-mail.dto';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let usersService: jest.Mocked<UsersService>;
  let followersService: jest.Mocked<FollowersService>;
  let repliesService: jest.Mocked<RepliesService>;
  let boostsService: jest.Mocked<BoostsService>;
  let favoritesService: jest.Mocked<FavoritesService>;
  let mailerService: jest.Mocked<MailerService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let readFileSyncSpy: jest.SpyInstance;

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
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FollowersService,
          useValue: {
            getWeeklyKpi: jest.fn(),
          },
        },
        {
          provide: RepliesService,
          useValue: {
            getWeeklyKpi: jest.fn(),
          },
        },
        {
          provide: BoostsService,
          useValue: {
            getWeeklyKpi: jest.fn(),
          },
        },
        {
          provide: FavoritesService,
          useValue: {
            getWeeklyKpi: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get(MailerService);
    usersService = module.get(UsersService);
    followersService = module.get(FollowersService);
    repliesService = module.get(RepliesService);
    boostsService = module.get(BoostsService);
    favoritesService = module.get(FavoritesService);

    // Setup spies for logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
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
    const mockTextTemplate = 'Reset link: {{ resetLink }} by {{ emailSenderName }}';
    const expectedTextBody = `Reset link: ${mockConfigValues.FRONTEND_URL}/reset-password?t=${token} by ${mockConfigValues.EMAIL_FROM_NAME}`;

    it('should send a password reset email successfully', async () => {
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendPasswordResetEmail(mockUser, token);

      expect(readFileSyncSpy).toHaveBeenCalledWith(path.join(__dirname, 'templates', 'password-reset.txt'), 'utf-8');
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './password-reset',
        text: expectedTextBody,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
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
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
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
    const mockTextTemplate = 'Verify here: {{ verificationLink }} from {{ emailSenderName }}';
    const expectedTextBody = `Verify here: ${mockConfigValues.FRONTEND_URL}/register/verify?c=${verificationCode} from ${mockConfigValues.EMAIL_FROM_NAME}`;

    it('should send an email verification mail successfully', async () => {
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendEmailVerificationMail(mockUser, verificationCode);

      expect(readFileSyncSpy).toHaveBeenCalledWith(
        path.join(__dirname, 'templates', 'email-verification.txt'),
        'utf-8',
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './email-verification',
        text: expectedTextBody,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
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
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
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
    const mockTextTemplate = 'Login at {{ appURL }} regards {{ emailSenderName }}';
    const expectedTextBody = `Login at ${mockConfigValues.FRONTEND_URL} regards ${mockConfigValues.EMAIL_FROM_NAME}`;

    it('should send an old account warning mail successfully', async () => {
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendOldAccountWarningMail(mockUser);

      expect(readFileSyncSpy).toHaveBeenCalledWith(
        path.join(__dirname, 'templates', 'old-account-warning.txt'),
        'utf-8',
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './old-account-warning',
        text: expectedTextBody,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
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
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
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
    const mockTextTemplate = 'Stats for {{ accountName }} at {{ appURL }} by {{ emailSenderName }}';
    const expectedTextBody = `Stats for ${mockAccount.accountName} at ${mockConfigValues.FRONTEND_URL} by ${mockConfigValues.EMAIL_FROM_NAME}`;

    it('should send a first stats available mail successfully', async () => {
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendFirstStatsAvailableMail(mockUser, mockAccount);

      expect(readFileSyncSpy).toHaveBeenCalledWith(
        path.join(__dirname, 'templates', 'first-stats-available.txt'),
        'utf-8',
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject,
        template: './first-stats-available',
        text: expectedTextBody,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
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

    it('should use account.name if account.accountName is not available for text body', async () => {
      const accountWithoutAccountName = { ...mockAccount, accountName: undefined } as AccountEntity;
      const expectedTextBodyFallback = `Stats for ${mockAccount.name} at ${mockConfigValues.FRONTEND_URL} by ${mockConfigValues.EMAIL_FROM_NAME}`;
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendFirstStatsAvailableMail(mockUser, accountWithoutAccountName);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expectedTextBodyFallback,
          context: expect.objectContaining({
            accountName: mockAccount.name, // Fallback to name
          }),
        }),
      );
    });

    it('should log an error and re-throw if sending fails', async () => {
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
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
    const mockTextTemplate = 'New user: {{ userEmail }} from {{ emailSenderName }}';
    const expectedTextBody = `New user: ${mockUser.email} from ${mockConfigValues.EMAIL_FROM_NAME}`;

    it('should send a signup notification mail to admin successfully', async () => {
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
      mailerService.sendMail.mockResolvedValueOnce(undefined);
      await service.sendSignupNotificationMail(mockUser);

      expect(readFileSyncSpy).toHaveBeenCalledWith(
        path.join(__dirname, 'templates', 'signup-notification.txt'),
        'utf-8',
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockConfigValues.EMAIL_FROM_ADDRESS, // Admin email
        subject,
        template: './signup-notification',
        text: expectedTextBody,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
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
      readFileSyncSpy.mockReturnValue(mockTextTemplate);
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
        followers: { value: '10', change: ' <span style="font-size: 24px; color: green;"> (+25%)</span>' },
        replies: { value: '5', change: ' <span style="font-size: 24px; color: red;"> (-17%)</span>' },
        boosts: { value: '20', change: ' <span style="font-size: 24px; color: green;"> (+33%)</span>' },
        favorites: { value: '15', change: '' },
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
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Weekly stats mail sent to ${mockUser.email} (User: ${mockUser.email})`,
      );
    });

    it('should log an error and re-throw if sending fails', async () => {
      const error = new Error('Mail sending failed');
      mailerService.sendMail.mockRejectedValueOnce(error);

      await expect(service.sendWeeklyStatsMail(mockUser, mockStats)).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Error while sending weekly stats mail to ${mockUser.email} (User: ${mockUser.email})`,
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

  describe('formatKpiForEmail', () => {
    it('should format KPI data with positive change', () => {
      const kpiData = { currentPeriod: 10, previousPeriod: 5 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({
        value: '10',
        change: ' <span style="font-size: 24px; color: green;"> (+100%)</span>',
      });
    });

    it('should format KPI data with negative change', () => {
      const kpiData = { currentPeriod: 3, previousPeriod: 5 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({ value: '3', change: ' <span style="font-size: 24px; color: red;"> (-40%)</span>' });
    });

    it('should format KPI data with no change', () => {
      const kpiData = { currentPeriod: 5, previousPeriod: 5 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({ value: '5', change: '' });
    });

    it('should handle undefined currentPeriod', () => {
      const kpiData = { previousPeriod: 5 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({ value: '0', change: '' });
    });

    it('should handle undefined previousPeriod', () => {
      const kpiData = { currentPeriod: 10 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({ value: '10', change: '' });
    });

    it('should handle both undefined periods', () => {
      const kpiData = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({ value: '0', change: '' });
    });

    it('should format large numbers with thousand separators', () => {
      const kpiData = { currentPeriod: 1234, previousPeriod: 1000 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (service as any).formatKpiForEmail(kpiData);
      expect(formatted).toEqual({
        value: '1,234',
        change: ' <span style="font-size: 24px; color: green;"> (+23%)</span>',
      });
    });
  });

  describe('processAndSendFirstStatsAvailableMail', () => {
    const dto: FirstStatsMailDto = {
      userID: 'user-id-123',
      accounts: ['account-id-456', 'account-id-789'],
    };
    const account1 = { id: 'account-id-456', name: 'Acc1' } as AccountEntity;
    const account2 = { id: 'account-id-789', name: 'Acc2' } as AccountEntity;

    it('should send emails if user and accounts are found', async () => {
      const userWithAccounts = {
        ...mockUser,
        accounts: {
          init: jest.fn().mockResolvedValue(undefined),
          getItems: jest.fn().mockReturnValue([account1, account2]),
        },
      } as unknown as UserEntity;
      usersService.findById.mockResolvedValue(userWithAccounts);
      jest.spyOn(service, 'sendFirstStatsAvailableMail').mockResolvedValue(undefined);

      await service.processAndSendFirstStatsAvailableMail(dto);

      expect(usersService.findById).toHaveBeenCalledWith(dto.userID);
      expect(service.sendFirstStatsAvailableMail).toHaveBeenCalledTimes(2);
      expect(service.sendFirstStatsAvailableMail).toHaveBeenCalledWith(userWithAccounts, account1);
      expect(service.sendFirstStatsAvailableMail).toHaveBeenCalledWith(userWithAccounts, account2);
    });

    it('should throw NotFoundException if user is not found', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(service.processAndSendFirstStatsAvailableMail(dto)).rejects.toThrow(NotFoundException);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `User not found: ${dto.userID} for first stats email. Email not sent.`,
      );
    });

    it('should log a warning and not send emails if no matching accounts found', async () => {
      const userWithNoMatchingAccounts = {
        ...mockUser,
        accounts: {
          init: jest.fn().mockResolvedValue(undefined),
          getItems: jest.fn().mockReturnValue([{ id: 'other-account' } as AccountEntity]),
        },
      } as unknown as UserEntity;
      usersService.findById.mockResolvedValue(userWithNoMatchingAccounts);
      const sendMailSpy = jest.spyOn(service, 'sendFirstStatsAvailableMail');

      await service.processAndSendFirstStatsAvailableMail(dto);

      expect(loggerWarnSpy).toHaveBeenCalled(); // loggerWarnSpy needs to be defined: jest.spyOn(Logger.prototype, 'warn');
      expect(sendMailSpy).not.toHaveBeenCalled();
    });
  });

  describe('processAndSendOldAccountWarningMail', () => {
    const dto: OldAccountMailDto = { userID: 'user-id-123' };

    it('should send email and update user if user is found', async () => {
      const userToUpdate = { ...mockUser, oldAccountDeletionNoticeSent: false } as UserEntity;
      usersService.findById.mockResolvedValue(userToUpdate);
      usersService.save.mockResolvedValue({ ...userToUpdate, oldAccountDeletionNoticeSent: true });
      jest.spyOn(service, 'sendOldAccountWarningMail').mockResolvedValue(undefined);

      await service.processAndSendOldAccountWarningMail(dto);

      expect(usersService.findById).toHaveBeenCalledWith(dto.userID);
      expect(userToUpdate.oldAccountDeletionNoticeSent).toBe(true);
      expect(usersService.save).toHaveBeenCalledWith(userToUpdate);
      expect(service.sendOldAccountWarningMail).toHaveBeenCalledWith(userToUpdate);
    });

    it('should throw NotFoundException if user is not found', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(service.processAndSendOldAccountWarningMail(dto)).rejects.toThrow(NotFoundException);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `User not found: ${dto.userID} for old account warning. Email not sent.`,
      );
    });
  });

  describe('processAndSendWeeklyStatsMail', () => {
    const account1 = {
      id: 'acc1',
      serverURL: 'http://mastodon.social',
      accountName: '@test@mastodon.social',
      setupComplete: true,
    } as AccountEntity;
    const account2 = {
      id: 'acc2',
      serverURL: 'http://example.com',
      name: 'Example Account',
      setupComplete: true,
    } as AccountEntity;
    const dto: WeeklyStatsMailDto = {
      userID: 'user-id-123',
      accounts: [account1.id, account2.id],
    };
    const userWithAccounts = {
      ...mockUser,
      accounts: {
        init: jest.fn().mockResolvedValue(undefined),
        getItems: jest.fn().mockReturnValue([account1, account2]),
      },
    } as unknown as UserEntity;

    const kpiResponse = { currentPeriod: 10, previousPeriod: 5 }; // Example KPI data

    beforeEach(() => {
      followersService.getWeeklyKpi.mockResolvedValue(kpiResponse);
      repliesService.getWeeklyKpi.mockResolvedValue(kpiResponse);
      boostsService.getWeeklyKpi.mockResolvedValue(kpiResponse);
      favoritesService.getWeeklyKpi.mockResolvedValue(kpiResponse);
      jest.spyOn(service, 'sendWeeklyStatsMail').mockResolvedValue(undefined);
    });

    it('should send weekly stats email with correct data', async () => {
      usersService.findById.mockResolvedValue(userWithAccounts);

      await service.processAndSendWeeklyStatsMail(dto);

      expect(usersService.findById).toHaveBeenCalledWith(dto.userID);
      expect(followersService.getWeeklyKpi).toHaveBeenCalledWith(account1);
      expect(followersService.getWeeklyKpi).toHaveBeenCalledWith(account2);
      expect(service.sendWeeklyStatsMail).toHaveBeenCalledTimes(1);
      const sendMailArgs = (service.sendWeeklyStatsMail as jest.Mock).mock.calls[0];
      expect(sendMailArgs[0]).toBe(userWithAccounts); // user
      expect(sendMailArgs[1].length).toBe(2); // stats array
      expect(sendMailArgs[1][0].accountName).toBe(account1.accountName);
      expect(sendMailArgs[1][1].accountName).toBe(account2.name); // Fallback
      expect(sendMailArgs[1][0].followers).toEqual({
        value: '10',
        change: ' <span style="font-size: 24px; color: green;"> (+100%)</span>',
      });
      expect(sendMailArgs[2]).toBeUndefined(); // rerouteToEmail
    });

    it('should reroute email if email is provided in DTO', async () => {
      usersService.findById.mockResolvedValue(userWithAccounts);
      const rerouteDto: WeeklyStatsMailDto = { ...dto, email: 'reroute@example.com' };
      await service.processAndSendWeeklyStatsMail(rerouteDto);
      expect(service.sendWeeklyStatsMail).toHaveBeenCalledWith(
        userWithAccounts,
        expect.any(Array),
        'reroute@example.com',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(service.processAndSendWeeklyStatsMail(dto)).rejects.toThrow(NotFoundException);
    });

    it('should log warning and not send if no setup-complete accounts match', async () => {
      const userWithNonSetupAccount = {
        ...mockUser,
        accounts: {
          init: jest.fn().mockResolvedValue(undefined),
          getItems: jest.fn().mockReturnValue([{ ...account1, setupComplete: false }]),
        },
      } as unknown as UserEntity;
      usersService.findById.mockResolvedValue(userWithNonSetupAccount);
      await service.processAndSendWeeklyStatsMail(dto);
      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(service.sendWeeklyStatsMail).not.toHaveBeenCalled();
    });

    it('should log error for an account if KPI fetching fails but send for others', async () => {
      usersService.findById.mockResolvedValue(userWithAccounts);
      followersService.getWeeklyKpi.mockImplementation(async (acc) => {
        if (acc.id === account1.id) throw new Error('KPI fetch failed');
        return kpiResponse;
      });

      await service.processAndSendWeeklyStatsMail(dto);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to retrieve weekly KPIs for account ${account1.id}`),
        expect.any(String), // stack
      );
      expect(service.sendWeeklyStatsMail).toHaveBeenCalledTimes(1);
      const sendMailArgs = (service.sendWeeklyStatsMail as jest.Mock).mock.calls[0];
      expect(sendMailArgs[1].length).toBe(1); // Only stats for account2
      expect(sendMailArgs[1][0].accountName).toBe(account2.name);
    });

    it('should log warning and not send if all KPI fetching fails', async () => {
      usersService.findById.mockResolvedValue(userWithAccounts);
      followersService.getWeeklyKpi.mockRejectedValue(new Error('KPI fetch failed'));
      repliesService.getWeeklyKpi.mockRejectedValue(new Error('KPI fetch failed'));
      boostsService.getWeeklyKpi.mockRejectedValue(new Error('KPI fetch failed'));
      favoritesService.getWeeklyKpi.mockRejectedValue(new Error('KPI fetch failed'));

      await service.processAndSendWeeklyStatsMail(dto);

      expect(loggerErrorSpy).toHaveBeenCalledTimes(2); // For account1 and account2
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `No stats successfully generated for user ${mockUser.email} (ID: ${mockUser.id}), weekly email not sent.`,
        ),
      );
      expect(service.sendWeeklyStatsMail).not.toHaveBeenCalled();
    });
  });
});

// Helper to define loggerWarnSpy if not already defined globally for tests
let loggerWarnSpy: jest.SpyInstance;
beforeAll(() => {
  loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');
});
afterAll(() => {
  loggerWarnSpy.mockRestore();
});
