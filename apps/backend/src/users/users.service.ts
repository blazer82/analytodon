import { UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
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
    return this.userRepository.findAll();
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
    return this.userRepository.findOne({ _id: new ObjectId(id) }, { populate: ['credentials'] });
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

  /**
   * Placeholder for sending an email to a group of users.
   * Note: Actual email sending logic is not implemented here.
   * @param sendEmailDto - DTO containing email details and recipient information.
   * @returns A promise that resolves when the operation is complete.
   */
  async sendEmailToUsers(sendEmailDto: SendEmailDto): Promise<void> {
    const { recipientGroup, recipients: recipientsString, subject, text, isTest } = sendEmailDto;
    this.logger.log(
      `Initiating email send: group=${recipientGroup}, subject="${subject}", isTest=${isTest}, customRecipientsProvided=${!!recipientsString}`,
    );

    const adminEmail = this.mailService['supportEmail']; // Accessing private member for admin email, consider making it public or via getter in MailService
    const recipientsSet = new Set<{ id?: string; email: string }>();

    if (isTest) {
      recipientsSet.add({ email: adminEmail });
      this.logger.log(`Test mode: Sending email to admin ${adminEmail}`);
    } else {
      if (recipientGroup === 'custom') {
        if (recipientsString) {
          recipientsString
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email)
            .forEach((email) => recipientsSet.add({ email }));
          this.logger.log(`Custom recipients: ${Array.from(recipientsSet).map((r) => r.email)}`);
        } else {
          this.logger.warn('Custom recipient group selected but no recipients string provided.');
        }
      } else {
        const filterQuery: FilterQuery<UserEntity> = {
          isActive: true,
          emailVerified: true,
          unsubscribed: { $nin: ['news'] }, // As per legacy, filter out those unsubscribed from 'news'
        };

        if (recipientGroup === 'admins') {
          filterQuery.role = UserRole.Admin;
        } else if (recipientGroup === 'account-owners') {
          filterQuery.role = UserRole.AccountOwner;
        }
        // For 'all', no additional role filter is applied beyond isActive, emailVerified, and not unsubscribed.

        const usersToEmail = await this.userRepository.find(filterQuery);
        usersToEmail.forEach((user) => recipientsSet.add({ id: user.id, email: user.email }));
        this.logger.log(
          `Fetched ${usersToEmail.length} users for group '${recipientGroup}'. Unique recipients: ${recipientsSet.size}`,
        );
      }
    }

    if (recipientsSet.size === 0) {
      this.logger.warn('No recipients determined for the email broadcast. Aborting.');
      return;
    }

    const emailPromises = Array.from(recipientsSet).map(async (recipient) => {
      let mailSubject = subject;
      let mailText = text;

      // Replace placeholders
      mailSubject = mailSubject.replaceAll('[[email]]', recipient.email);
      mailText = mailText.replaceAll('[[email]]', recipient.email);

      if (recipient.id) {
        mailSubject = mailSubject.replaceAll('[[userid]]', recipient.id);
        mailText = mailText.replaceAll('[[userid]]', recipient.id);
      } else {
        // For custom emails where ID might not be available
        mailSubject = mailSubject.replaceAll('[[userid]]', '');
        mailText = mailText.replaceAll('[[userid]]', '');
      }

      try {
        await this.mailService.sendGenericPlainTextEmail(recipient.email, mailSubject, mailText);
        this.logger.log(
          `Email sent to ${recipient.email} (User ID: ${recipient.id || 'N/A'}) with subject "${mailSubject}"`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${recipient.email} (User ID: ${recipient.id || 'N/A'}): ${error.message}`,
          error.stack,
        );
        // Decide if one failure should stop all, or collect errors. For now, log and continue.
      }
    });

    await Promise.all(emailPromises);
    this.logger.log(
      `Finished processing email send request for subject "${subject}". Total emails attempted: ${emailPromises.length}.`,
    );
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
