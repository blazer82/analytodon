import * as fs from 'fs';
import * as path from 'path';

import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { MailerService } from '@nestjs-modules/mailer';
import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as handlebars from 'handlebars';
import { I18nService } from 'nestjs-i18n';

import { BoostsService } from '../boosts/boosts.service';
import { FavoritesService } from '../favorites/favorites.service';
import { FollowersService } from '../followers/followers.service';
import { RepliesService } from '../replies/replies.service';
import { UsersService } from '../users/users.service';
import { FirstStatsMailDto } from './dto/first-stats-mail.dto';
import { OldAccountMailDto } from './dto/old-account-mail.dto';
import { WeeklyStatsMailDto } from './dto/weekly-stats-mail.dto';

interface FormattedKpi {
  value: string;
  change: string; // e.g., "(+5)", "(-2)", "(no change)"
}

interface WeeklyStatItem {
  accountName: string;
  followers: FormattedKpi;
  replies: FormattedKpi;
  boosts: FormattedKpi;
  favorites: FormattedKpi;
}

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
    private readonly i18n: I18nService,
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
   * Gets the user's locale, defaulting to 'en' if not set
   * @param user - The user entity
   * @returns The user's locale string
   */
  private getUserLocale(user: UserEntity): string {
    return user.locale || 'en';
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

  /**
   * Translates email content based on user's locale
   * @param key - The translation key
   * @param locale - The user's locale
   * @param args - Optional translation arguments
   * @returns Translated string
   */
  private async translate(key: string, locale: string, args?: Record<string, string | number>): Promise<string> {
    return this.i18n.translate(key, { lang: locale, args });
  }

  private formatKpiForEmail(kpiData: { currentPeriod?: number; trend?: number }, locale: string = 'en'): FormattedKpi {
    const currentValue = kpiData.currentPeriod ?? 0;
    const formattedValue = new Intl.NumberFormat(locale).format(currentValue);

    const trend = kpiData.trend;

    let changeString = '';
    if (trend) {
      const trendPercentage = (trend * 100).toFixed(0);
      const color = trend > 0 ? 'green' : 'red';
      const sign = trend > 0 ? '+' : '';
      changeString = ` <span style="font-size: 24px; color: ${color};"> (${sign}${trendPercentage}%)</span>`;
    }

    return { value: formattedValue, change: changeString };
  }

  /**
   * Sends a password reset email to a user.
   * @param user - The user entity.
   * @param token - The password reset token.
   * @returns A promise that resolves when the email is sent.
   * @throws Error if sending the email fails.
   */
  async sendPasswordResetEmail(user: UserEntity, token: string) {
    const locale = this.getUserLocale(user);
    const resetLink = `${this.frontendURL}/reset-password?t=${token}`; // Legacy used 't', frontend might expect 'token'
    const subject = await this.translate('email.passwordReset.subject', locale);

    const context = {
      ...this.getCommonContext(),
      resetLink,
      subject,
      t: {
        title: await this.translate('email.passwordReset.title', locale),
        greeting: await this.translate('email.passwordReset.greeting', locale),
        message: await this.translate('email.passwordReset.message', locale),
        securityNote: await this.translate('email.passwordReset.securityNote', locale),
        instruction: await this.translate('email.passwordReset.instruction', locale),
        button: await this.translate('email.passwordReset.button', locale),
        fallback: await this.translate('email.passwordReset.fallback', locale),
        signature: await this.translate('email.passwordReset.signature', locale),
        email: await this.translate('email.common.email', locale),
        website: await this.translate('email.common.website', locale),
        mastodon: await this.translate('email.common.mastodon', locale),
        mastodonHandle: await this.translate('email.common.mastodonHandle', locale),
      },
    };

    const textTemplatePath = path.join(__dirname, 'templates', 'password-reset.txt');
    const textTemplateSource = fs.readFileSync(textTemplatePath, 'utf-8');
    const compiledTextTemplate = handlebars.compile(textTemplateSource, { noEscape: true });
    const textBody = compiledTextTemplate(context);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './password-reset', // HTML template
        text: textBody, // Plain text version
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
        context, // Context for HTML template
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
    const locale = this.getUserLocale(user);
    const verificationLink = `${this.frontendURL}/register/verify?c=${verificationCode}`;
    const subject = await this.translate('email.emailVerification.subject', locale);

    const context = {
      ...this.getCommonContext(),
      verificationLink,
      subject,
      t: {
        title: await this.translate('email.emailVerification.title', locale),
        greeting: await this.translate('email.emailVerification.greeting', locale),
        instruction: await this.translate('email.emailVerification.instruction', locale),
        button: await this.translate('email.emailVerification.button', locale),
        fallback: await this.translate('email.emailVerification.fallback', locale),
        signature: await this.translate('email.emailVerification.signature', locale),
        email: await this.translate('email.common.email', locale),
        website: await this.translate('email.common.website', locale),
        mastodon: await this.translate('email.common.mastodon', locale),
        mastodonHandle: await this.translate('email.common.mastodonHandle', locale),
      },
    };

    const textTemplatePath = path.join(__dirname, 'templates', 'email-verification.txt');
    const textTemplateSource = fs.readFileSync(textTemplatePath, 'utf-8');
    const compiledTextTemplate = handlebars.compile(textTemplateSource, { noEscape: true });
    const textBody = compiledTextTemplate(context);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './email-verification', // HTML template
        text: textBody, // Plain text version
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
        context, // Context for HTML template
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
    const locale = this.getUserLocale(user);
    const subject = await this.translate('email.oldAccountWarning.subject', locale);

    const context = {
      ...this.getCommonContext(),
      subject,
      t: {
        title: await this.translate('email.oldAccountWarning.title', locale),
        greeting: await this.translate('email.oldAccountWarning.greeting', locale),
        warningMessage: await this.translate('email.oldAccountWarning.warningMessage', locale),
        instruction: await this.translate('email.oldAccountWarning.instruction', locale),
        button: await this.translate('email.oldAccountWarning.button', locale),
        noAction: await this.translate('email.oldAccountWarning.noAction', locale),
        signature: await this.translate('email.oldAccountWarning.signature', locale),
        email: await this.translate('email.common.email', locale),
        website: await this.translate('email.common.website', locale),
        mastodon: await this.translate('email.common.mastodon', locale),
        mastodonHandle: await this.translate('email.common.mastodonHandle', locale),
      },
    };

    const textTemplatePath = path.join(__dirname, 'templates', 'old-account-warning.txt');
    const textTemplateSource = fs.readFileSync(textTemplatePath, 'utf-8');
    const compiledTextTemplate = handlebars.compile(textTemplateSource, { noEscape: true });
    const textBody = compiledTextTemplate(context);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './old-account-warning', // HTML template
        text: textBody, // Plain text version
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
        context, // Context for HTML template
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
    const locale = this.getUserLocale(user);
    const accountName = account.accountName || account.name;
    const subject = await this.translate('email.firstStatsAvailable.subject', locale);

    const context = {
      ...this.getCommonContext(),
      accountName,
      subject,
      t: {
        title: await this.translate('email.firstStatsAvailable.title', locale),
        greeting: await this.translate('email.firstStatsAvailable.greeting', locale),
        message: await this.translate('email.firstStatsAvailable.message', locale, { accountName }),
        instruction: await this.translate('email.firstStatsAvailable.instruction', locale),
        button: await this.translate('email.firstStatsAvailable.button', locale),
        support: await this.translate('email.firstStatsAvailable.support', locale),
        signature: await this.translate('email.firstStatsAvailable.signature', locale),
        email: await this.translate('email.common.email', locale),
        website: await this.translate('email.common.website', locale),
        mastodon: await this.translate('email.common.mastodon', locale),
        mastodonHandle: await this.translate('email.common.mastodonHandle', locale),
      },
    };

    const textTemplatePath = path.join(__dirname, 'templates', 'first-stats-available.txt');
    const textTemplateSource = fs.readFileSync(textTemplatePath, 'utf-8');
    const compiledTextTemplate = handlebars.compile(textTemplateSource, { noEscape: true });
    const textBody = compiledTextTemplate(context);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        template: './first-stats-available', // HTML template
        text: textBody, // Plain text version
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
        context, // Context for HTML template
      });
      this.logger.log(`First stats available mail sent to ${user.email} for account ${accountName}`);
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
    const locale = 'en'; // Admin notification always in English
    const subject = await this.translate('email.signupNotification.subject', locale);

    const context = {
      ...this.getCommonContext(),
      userEmail: newUser.email,
      subject,
      t: {
        title: await this.translate('email.signupNotification.title', locale),
        message: await this.translate('email.signupNotification.message', locale),
        signature: await this.translate('email.signupNotification.signature', locale),
        email: await this.translate('email.common.email', locale),
        website: await this.translate('email.common.website', locale),
        mastodon: await this.translate('email.common.mastodon', locale),
        mastodonHandle: await this.translate('email.common.mastodonHandle', locale),
      },
    };

    const textTemplatePath = path.join(__dirname, 'templates', 'signup-notification.txt');
    const textTemplateSource = fs.readFileSync(textTemplatePath, 'utf-8');
    const compiledTextTemplate = handlebars.compile(textTemplateSource, { noEscape: true });
    const textBody = compiledTextTemplate(context);

    try {
      await this.mailerService.sendMail({
        to: this.supportEmail, // Send to admin/support email
        subject,
        template: './signup-notification', // HTML template
        text: textBody, // Plain text version
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, 'templates', 'assets', 'logo.png'),
            cid: 'logo@analytodon.com',
          },
        ],
        context, // Context for HTML template
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
    const locale = this.getUserLocale(user);
    const subject = await this.translate('email.weeklyStats.subject', locale);
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
          t: {
            title: await this.translate('email.weeklyStats.title', locale),
            followers: await this.translate('email.weeklyStats.followers', locale),
            followersLabel: await this.translate('email.weeklyStats.followersLabel', locale),
            replies: await this.translate('email.weeklyStats.replies', locale),
            repliesLabel: await this.translate('email.weeklyStats.repliesLabel', locale),
            boosts: await this.translate('email.weeklyStats.boosts', locale),
            boostsLabel: await this.translate('email.weeklyStats.boostsLabel', locale),
            favorites: await this.translate('email.weeklyStats.favorites', locale),
            favoritesLabel: await this.translate('email.weeklyStats.favoritesLabel', locale),
            dashboardButton: await this.translate('email.weeklyStats.dashboardButton', locale),
            unsubscribe: await this.translate('email.weeklyStats.unsubscribe', locale),
            unsubscribeLink: await this.translate('email.weeklyStats.unsubscribeLink', locale),
          },
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

    const locale = this.getUserLocale(user);
    const statsForEmail: WeeklyStatItem[] = [];

    for (const account of userAccounts) {
      try {
        const followersKpiData = await this.followersService.getWeeklyKpi(account);
        const repliesKpiData = await this.repliesService.getWeeklyKpi(account);
        const boostsKpiData = await this.boostsService.getWeeklyKpi(account);
        const favoritesKpiData = await this.favoritesService.getWeeklyKpi(account);

        statsForEmail.push({
          accountName: account.name || account.accountName || new URL(account.serverURL).hostname,
          followers: this.formatKpiForEmail(followersKpiData, locale),
          replies: this.formatKpiForEmail(repliesKpiData, locale),
          boosts: this.formatKpiForEmail(boostsKpiData, locale),
          favorites: this.formatKpiForEmail(favoritesKpiData, locale),
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
