import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { MailerService } from '@nestjs-modules/mailer';
import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BoostsService } from '../boosts/boosts.service';
import { FavoritesService } from '../favorites/favorites.service';
import { FollowersService } from '../followers/followers.service';
import { RepliesService } from '../replies/replies.service';
import { UsersService } from '../users/users.service';
import { FirstStatsMailDto } from './dto/first-stats-mail.dto';
import { OldAccountMailDto } from './dto/old-account-mail.dto';
import { WeeklyStatsMailDto } from './dto/weekly-stats-mail.dto';

interface FormattedKpi {
  value: number;
  change: string; // e.g., "(+5)", "(-2)", "(no change)"
}

interface WeeklyStatItem {
  accountName: string;
  followers: FormattedKpi;
  replies: FormattedKpi;
  boosts: FormattedKpi;
  favorites: FormattedKpi;
}

// TODO: Check and replace URLs in mails !!!

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendURL: string;
  private readonly supportEmail: string;
  private readonly marketingURL: string;
  private readonly emailSenderName: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
    private readonly followersService: FollowersService,
    private readonly repliesService: RepliesService,
    private readonly boostsService: BoostsService,
    private readonly favoritesService: FavoritesService,
  ) {
    this.frontendURL = this.configService.getOrThrow<string>('FRONTEND_URL');
    this.supportEmail = this.configService.getOrThrow<string>('EMAIL_FROM_ADDRESS');
    this.marketingURL = this.configService.getOrThrow<string>('MARKETING_URL');
    this.emailSenderName = this.configService.getOrThrow<string>('EMAIL_FROM_NAME');
  }

  /**
   * Retrieves common context variables for email templates.
   * @returns An object containing common email context variables.
   */
  private getCommonContext(): {
    appURL: string;
    supportEmail: string;
    marketingURL: string;
    emailSenderName: string;
  } {
    return {
      appURL: this.frontendURL,
      supportEmail: this.supportEmail,
      marketingURL: this.marketingURL,
      emailSenderName: this.emailSenderName,
    };
  }

  private formatKpiForEmail(kpiData: { currentPeriod?: number; previousPeriod?: number }): FormattedKpi {
    const currentValue = kpiData.currentPeriod ?? 0;
    const previousValue = kpiData.previousPeriod ?? 0;
    const diff = currentValue - previousValue;

    let changeString = '';
    if (kpiData.currentPeriod === undefined || kpiData.previousPeriod === undefined) {
      changeString = ''; // Or '(data pending)'
    } else if (diff > 0) {
      changeString = `(+${diff})`;
    } else if (diff < 0) {
      changeString = `(${diff})`;
    } else {
      changeString = '(no change)';
    }
    return { value: currentValue, change: changeString };
  }

  /**
   * Sends a password reset email to a user.
   * @param user - The user entity.
   * @param token - The password reset token.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendPasswordResetEmail(user: UserEntity, token: string) {
    const resetLink = `${this.frontendURL}/reset-password?t=${token}`; // Legacy used 't', frontend might expect 'token'
    const subject = 'Reset your Analytodon password!';

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './password-reset',
        context: {
          ...this.getCommonContext(),
          resetLink,
          subject,
        },
      });
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Sends an email verification mail to a user.
   * @param user - The user entity.
   * @param verificationCode - The email verification code.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendEmailVerificationMail(user: UserEntity, verificationCode: string) {
    const verificationLink = `${this.frontendURL}/register/verify?c=${verificationCode}`;
    const subject = 'Welcome to Analytodon - Please verify your email address';

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './email-verification',
        context: {
          ...this.getCommonContext(),
          verificationLink,
          subject,
        },
      });
      this.logger.log(`Email verification mail sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification mail to ${user.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Sends a warning email to a user about old account deletion.
   * @param user - The user entity.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendOldAccountWarningMail(user: UserEntity) {
    const subject = "You haven't been on Analytodon in a while - we'll be deleting your data soon!";
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './old-account-warning',
        context: {
          ...this.getCommonContext(),
          subject,
        },
      });
      this.logger.log(`Old account warning mail sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Error while sending old account warning mail to ${user.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Sends an email notifying a user that their first stats are available.
   * @param user - The user entity.
   * @param account - The account entity for which stats are available.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendFirstStatsAvailableMail(user: UserEntity, account: AccountEntity) {
    const subject = 'Your Mastodon analytics data is ready on Analytodon! 🎉';
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './first-stats-available',
        context: {
          ...this.getCommonContext(),
          accountName: account.accountName || account.name,
          subject,
        },
      });
      this.logger.log(
        `First stats available mail sent to ${user.email} for account ${account.accountName || account.name}`,
      );
    } catch (error) {
      this.logger.error(`Error while sending first stats available mail to ${user.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Sends a notification email to admin about a new user signup.
   * @param newUser - The newly registered user entity.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendSignupNotificationMail(newUser: UserEntity) {
    const subject = 'Analytodon: New Sign Up';
    try {
      await this.mailerService.sendMail({
        to: this.supportEmail, // Send to admin/support email
        subject,
        template: './signup-notification',
        context: {
          ...this.getCommonContext(),
          userEmail: newUser.email,
          subject,
        },
      });
      this.logger.log(`Sign up notification mail sent to admin for user ${newUser.email}`);
    } catch (error) {
      this.logger.error(`Error while sending sign up notification mail for ${newUser.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Sends a weekly statistics email to a user.
   * @param user - The user entity.
   * @param stats - An array of weekly stat items.
   * @param rerouteToEmail - Optional email address to send the email to instead of the user's.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendWeeklyStatsMail(user: UserEntity, stats: WeeklyStatItem[], rerouteToEmail?: string) {
    const subject = 'Your Week on Mastodon';
    const unsubscribeURL = `${this.frontendURL}/unsubscribe/weekly?u=${encodeURIComponent(user.id)}&e=${encodeURIComponent(user.email)}`;
    const recipientEmail = rerouteToEmail || user.email;

    try {
      await this.mailerService.sendMail({
        to: recipientEmail,
        subject,
        template: './weekly-stats',
        context: {
          ...this.getCommonContext(),
          stats,
          unsubscribeURL,
          subject,
        },
      });
      this.logger.log(`Weekly stats mail sent to ${recipientEmail} (User: ${user.email})`);
    } catch (error) {
      this.logger.error(
        `Error while sending weekly stats mail to ${recipientEmail} (User: ${user.email})`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Sends a generic plain text email.
   * @param to - The recipient's email address.
   * @param subject - The email subject.
   * @param textBody - The plain text body of the email.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendGenericPlainTextEmail(to: string, subject: string, textBody: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        text: textBody,
        // `from` address is picked from MailerModule defaults
      });
      this.logger.log(`Generic plain text email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send generic plain text email to ${to} with subject "${subject}"`, error.stack);
      throw error;
    }
  }

  async processAndSendFirstStatsAvailableMail(firstStatsDto: FirstStatsMailDto): Promise<void> {
    const user = await this.usersService.findById(firstStatsDto.userID);
    if (!user) {
      this.logger.error(`User not found: ${firstStatsDto.userID} for first stats email. Email not sent.`);
      throw new NotFoundException(`User with ID ${firstStatsDto.userID} not found.`);
    }

    await user.accounts.init(); // Ensure accounts are loaded
    const userAccounts = user.accounts.getItems();
    const accountsToSendMailFor = userAccounts.filter((acc) => firstStatsDto.accounts.includes(acc.id));

    if (accountsToSendMailFor.length === 0) {
      this.logger.warn(
        `No matching accounts found for user ${user.email} (ID: ${user.id}) for first stats email. Provided account IDs: ${firstStatsDto.accounts.join(', ')}. User account IDs: ${userAccounts.map((a) => a.id).join(', ')}. Email not sent.`,
      );
      return; // Mimic legacy behavior of not erroring out if accounts are not found
    }

    for (const account of accountsToSendMailFor) {
      await this.sendFirstStatsAvailableMail(user, account);
    }
  }

  async processAndSendOldAccountWarningMail(oldAccountDto: OldAccountMailDto): Promise<void> {
    const user = await this.usersService.findById(oldAccountDto.userID);
    if (!user) {
      this.logger.error(`User not found: ${oldAccountDto.userID} for old account warning. Email not sent.`);
      throw new NotFoundException(`User with ID ${oldAccountDto.userID} not found.`);
    }

    user.oldAccountDeletionNoticeSent = true;
    await this.usersService.save(user);

    await this.sendOldAccountWarningMail(user);
  }

  async processAndSendWeeklyStatsMail(weeklyStatsDto: WeeklyStatsMailDto): Promise<void> {
    const user = await this.usersService.findById(weeklyStatsDto.userID);
    if (!user) {
      this.logger.error(`User not found: ${weeklyStatsDto.userID} for weekly stats email. Email not sent.`);
      throw new NotFoundException(`User with ID ${weeklyStatsDto.userID} not found.`);
    }

    await user.accounts.init();
    const userAccounts = user.accounts
      .getItems()
      .filter((acc) => weeklyStatsDto.accounts.includes(acc.id) && acc.setupComplete);

    if (userAccounts.length === 0) {
      this.logger.warn(
        `No matching and setup-complete accounts found for user ${user.email} (ID: ${user.id}) for weekly stats email. Provided account IDs: ${weeklyStatsDto.accounts.join(', ')}. Email not sent.`,
      );
      return; // Mimic legacy behavior
    }

    const statsForEmail: WeeklyStatItem[] = [];

    for (const account of userAccounts) {
      try {
        const followersKpiData = await this.followersService.getWeeklyKpi(account);
        const repliesKpiData = await this.repliesService.getWeeklyKpi(account);
        const boostsKpiData = await this.boostsService.getWeeklyKpi(account);
        const favoritesKpiData = await this.favoritesService.getWeeklyKpi(account);

        statsForEmail.push({
          accountName: account.accountName || account.name || new URL(account.serverURL).hostname,
          followers: this.formatKpiForEmail(followersKpiData),
          replies: this.formatKpiForEmail(repliesKpiData),
          boosts: this.formatKpiForEmail(boostsKpiData),
          favorites: this.formatKpiForEmail(favoritesKpiData),
        });
      } catch (error) {
        this.logger.error(
          `Failed to retrieve weekly KPIs for account ${account.id} (User: ${user.email}): ${error.message}`,
          error.stack,
        );
      }
    }

    if (statsForEmail.length > 0) {
      await this.sendWeeklyStatsMail(user, statsForEmail, weeklyStatsDto.email);
    } else {
      this.logger.warn(
        `No stats successfully generated for user ${user.email} (ID: ${user.id}), weekly email not sent. This might be due to errors fetching KPIs for all specified accounts.`,
      );
    }
  }
}
