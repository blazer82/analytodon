import { EntityRepository, Loaded } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';

import { UserCredentialsEntity } from '../auth/entities/user-credentials.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ManageSubscriptionDto } from './dto/subscription-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
    @InjectRepository(UserCredentialsEntity)
    private readonly userCredentialsRepository: EntityRepository<UserCredentialsEntity>,
  ) {}

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

  async findAll(): Promise<UserEntity[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<UserEntity | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    // Populate credentials for potential password updates by admin
    return this.userRepository.findOne({ _id: new ObjectId(id) }, { populate: ['credentials'] });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ email }); // isActive check might be too restrictive for admin view
  }

  async findByEmailVerificationCode(code: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ emailVerificationCode: code, isActive: true });
  }

  async findByResetPasswordToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ resetPasswordToken: token, isActive: true }, { populate: ['credentials'] });
  }

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

  async sendEmailToUsers(sendEmailDto: SendEmailDto): Promise<void> {
    const { recipientGroup, recipients, subject, text: _text, isTest } = sendEmailDto;
    this.logger.warn(
      `MailService.sendEmail called with: group=${recipientGroup}, subject=${subject}, isTest=${isTest}. Actual email sending is not implemented in UsersService.`,
    );
    // TODO: Implement the actual email sending logic.
    // 1. Determine the list of recipient UserEntities based on recipientGroup.
    //    - 'all': all active, email-verified users not unsubscribed from 'news' (or relevant type).
    //    - 'admins': all UserRole.Admin users.
    //    - 'account-owners': all UserRole.AccountOwner users.
    //    - 'custom': parse `recipients` string.
    // 2. For each recipient, call a MailService (e.g., this.mailService.sendGenericEmail(...)).
    //    - Replace placeholders like [[userid]], [[email]] in the text.
    //    - Handle batching if necessary.
    if (recipients) {
      this.logger.log(`Custom recipients: ${recipients}`);
    }
  }

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

  async save(user: UserEntity): Promise<UserEntity> {
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }
}
