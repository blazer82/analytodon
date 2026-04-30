import { UserCredentialsEntity, UserEntity } from '@analytodon/shared-orm';
import { EntityRepository, FilterQuery, Loaded } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ConflictException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';

import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ManageSubscriptionDto } from './dto/subscription-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
    @InjectRepository(UserCredentialsEntity)
    private readonly userCredentialsRepository: EntityRepository<UserCredentialsEntity>,
    @Inject(forwardRef(() => MailService)) private readonly mailService: MailService,
  ) {}

  /**
   * Creates a new user (typically by an admin).
   * @param createUserDto - DTO containing user creation data.
   * @returns A promise that resolves to the created user entity.
   * @throws ConflictException if a user with the given email already exists.
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { email, password, role, isActive, maxAccounts, serverURLOnSignUp, timezone } = createUserDto;

    const existingUser = await this.userRepository.findOne({ email });
    if (existingUser) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const user = this.userRepository.create({
      email,
      role,
      isActive: isActive ?? true,
      emailVerified: false, // Admins can verify later if needed, or a separate flow
      maxAccounts,
      serverURLOnSignUp,
      timezone,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const userCredentials = this.userCredentialsRepository.create({
      passwordHash,
      user,
    });
    user.credentials = userCredentials;

    try {
      await this.userRepository.getEntityManager().persistAndFlush([user, userCredentials]);
      // Note: MailService for verification email is not called here as it's out of scope.
      this.logger.log(`Admin created user: ${user.email}`);
    } catch (error) {
      this.logger.error(`Error during admin user creation: ${error.message}`, error.stack);
      if (error.code === 11000 || error.message?.includes('unique')) {
        throw new ConflictException('A user with this email address already exists.');
      }
      throw error;
    }
    return user;
  }

  /**
   * Retrieves all users.
   * @returns A promise that resolves to an array of user entities.
   */
  async findAll(): Promise<UserEntity[]> {
    return this.userRepository.findAll({ populate: ['accounts'], orderBy: { createdAt: 'DESC' } });
  }

  /**
   * Finds a user by their ID.
   * @param id - The ID of the user.
   * @returns A promise that resolves to the user entity or null if not found.
   */
  async findById(id: string): Promise<UserEntity | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    // Populate credentials for potential password updates by admin
    return this.userRepository.findOne({ _id: new ObjectId(id) }, { populate: ['credentials', 'accounts'] });
  }

  /**
   * Finds a user by their email address.
   * @param email - The email address of the user.
   * @returns A promise that resolves to the user entity or null if not found.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ email }); // isActive check might be too restrictive for admin view
  }

  /**
   * Finds an active user by their email verification code.
   * @param code - The email verification code.
   * @returns A promise that resolves to the user entity or null if not found or not active.
   */
  async findByEmailVerificationCode(code: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ emailVerificationCode: code, isActive: true });
  }

  /**
   * Finds an active user by their password reset token.
   * Populates credentials for password reset.
   * @param token - The password reset token.
   * @returns A promise that resolves to the user entity or null if not found or not active.
   */
  async findByResetPasswordToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ resetPasswordToken: token, isActive: true }, { populate: ['credentials'] });
  }

  /**
   * Updates an existing user's information.
   * @param id - The ID of the user to update.
   * @param updateUserDto - DTO containing user update data.
   * @returns A promise that resolves to the updated user entity.
   * @throws NotFoundException if the user is not found.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const { password, ...otherUpdates } = updateUserDto;
    this.userRepository.assign(user, otherUpdates);

    if (password) {
      if (!user.credentials) {
        // This case should be rare if users are created correctly with credentials
        this.logger.warn(`User ${user.email} (ID: ${id}) has no credentials. Creating new ones for password update.`);
        const newPasswordHash = await bcrypt.hash(password, 10);
        const newUserCredentials = this.userCredentialsRepository.create({
          passwordHash: newPasswordHash,
          user,
        });
        user.credentials = newUserCredentials;
        await this.userCredentialsRepository.getEntityManager().persistAndFlush(newUserCredentials);
      } else {
        const newPasswordHash = await bcrypt.hash(password, 10);
        (user.credentials as Loaded<UserCredentialsEntity, never>).passwordHash = newPasswordHash;
        // Mark credentials as changed if it's a separate entity in UoW
        await this.userCredentialsRepository.getEntityManager().persistAndFlush(user.credentials);
      }
    }

    await this.userRepository.getEntityManager().persistAndFlush(user);
    this.logger.log(`User ${user.email} (ID: ${id}) updated by admin.`);
    return user;
  }

  private resolveLocale(user: UserEntity): 'en' | 'de' {
    return user.locale === 'de' ? 'de' : 'en';
  }

  private async getEligibleRecipients(recipientGroup: 'all' | 'active'): Promise<UserEntity[]> {
    const filterQuery: FilterQuery<UserEntity> = {
      isActive: true,
      emailVerified: true,
      unsubscribed: { $nin: ['news'] },
    };

    if (recipientGroup === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filterQuery.lastLoginAt = { $gte: thirtyDaysAgo };
    }

    const users = await this.userRepository.find(filterQuery, { populate: ['accounts'] });
    return users.filter((user) => user.accounts.getItems().some((account) => account.setupComplete));
  }

  async getRecipientCount(recipientGroup: 'all' | 'active'): Promise<number> {
    const recipients = await this.getEligibleRecipients(recipientGroup);
    return recipients.length;
  }

  private replacePlaceholders(text: string, email: string, userId: string): string {
    return text.replaceAll('[[email]]', email).replaceAll('[[userid]]', userId);
  }

  async sendEmailToUsers(sendEmailDto: SendEmailDto): Promise<void> {
    const { recipientGroup, subjectEn, subjectDe, textEn, textDe, isTest } = sendEmailDto;
    this.logger.log(`Initiating email send: group=${recipientGroup}, isTest=${isTest}`);

    if (isTest) {
      const adminEmail = this.mailService['supportEmail'];
      this.logger.log(`Test mode: Sending both language versions to ${adminEmail}`);

      await this.mailService.sendBroadcastEmail(adminEmail, `[TEST - EN] ${subjectEn}`, textEn, 'en');
      await this.mailService.sendBroadcastEmail(adminEmail, `[TEST - DE] ${subjectDe}`, textDe, 'de');

      this.logger.log('Test emails sent successfully.');
      return;
    }

    const recipients = await this.getEligibleRecipients(recipientGroup);

    if (recipients.length === 0) {
      this.logger.warn('No recipients determined for the email broadcast. Aborting.');
      return;
    }

    this.logger.log(`Sending email to ${recipients.length} recipients for group '${recipientGroup}'.`);

    const emailPromises = recipients.map(async (user) => {
      const locale = this.resolveLocale(user);
      const subject = locale === 'de' ? subjectDe : subjectEn;
      const text = locale === 'de' ? textDe : textEn;

      const mailSubject = this.replacePlaceholders(subject, user.email, user.id);
      const mailText = this.replacePlaceholders(text, user.email, user.id);

      try {
        await this.mailService.sendBroadcastEmail(user.email, mailSubject, mailText, locale);
        this.logger.log(`Email sent to ${user.email} (locale=${locale})`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${user.email}: ${error.message}`, error.stack);
      }
    });

    await Promise.all(emailPromises);
    this.logger.log(`Finished processing email broadcast. Total emails attempted: ${emailPromises.length}.`);
  }

  /**
   * Manages a user's subscription status for a specific email type.
   * @param manageSubscriptionDto - DTO containing user ID and email for verification.
   * @param type - The type of subscription to manage (e.g., 'weekly-stats', 'news').
   * @param subscribe - Boolean indicating whether to subscribe (true) or unsubscribe (false).
   * @returns A promise that resolves when the subscription status is updated.
   */
  async manageSubscription(
    manageSubscriptionDto: ManageSubscriptionDto,
    type: string,
    subscribe: boolean,
  ): Promise<void> {
    const { u: userId, e: email } = manageSubscriptionDto;
    const user = await this.userRepository.findOne({ _id: new ObjectId(userId), email });

    if (!user) {
      // Do not reveal if user exists for privacy, matching legacy behavior.
      this.logger.warn(
        `Subscription management: User not found or email mismatch for ID ${userId} and email ${email}.`,
      );
      return;
    }

    let unsubscribedTypes = user.unsubscribed ? [...user.unsubscribed] : [];

    if (subscribe) {
      // Remove the type from unsubscribed list
      unsubscribedTypes = unsubscribedTypes.filter((t) => t !== type);
    } else {
      // Add the type to unsubscribed list if not already present
      if (!unsubscribedTypes.includes(type)) {
        unsubscribedTypes.push(type);
      }
    }
    user.unsubscribed = unsubscribedTypes;
    await this.userRepository.getEntityManager().persistAndFlush(user);
    this.logger.log(
      `User ${email} subscription status for '${type}' updated to ${subscribe ? 'subscribed' : 'unsubscribed'}.`,
    );
  }

  /**
   * Saves a user entity to the database.
   * This is a general purpose save method, often used internally after modifying a user entity.
   * @param user - The user entity to save.
   * @returns A promise that resolves to the saved user entity.
   */
  async save(user: UserEntity): Promise<UserEntity> {
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }
}
