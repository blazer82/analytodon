import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccountEntity } from '../accounts/entities/account.entity';
import { UserEntity } from '../users/entities/user.entity';

// TODO: Replace these with actual imports from your entity definitions
interface Kpi {
  value: number | string;
  change: number | string;
}

interface WeeklyStatItem {
  accountName: string;
  followers: Kpi;
  replies: Kpi;
  boosts: Kpi;
  favorites: Kpi;
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
  private getCommonContext() {
    return {
      supportEmail: this.supportEmail,
      marketingURL: this.marketingURL,
      emailSenderName: this.emailSenderName,
    };
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
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendWeeklyStatsMail(user: UserEntity, stats: WeeklyStatItem[]) {
    const subject = 'Your Week on Mastodon';
    const unsubscribeURL = `${this.frontendURL}/unsubscribe/weekly?u=${encodeURIComponent(user.id)}&e=${encodeURIComponent(user.email)}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './weekly-stats',
        context: {
          ...this.getCommonContext(),
          stats,
          unsubscribeURL,
          subject,
        },
      });
      this.logger.log(`Weekly stats mail sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Error while sending weekly stats mail to ${user.email}`, error.stack);
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
}
