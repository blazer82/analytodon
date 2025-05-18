import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';

import { MailService } from '../mail/mail.service';
import { UserRole } from '../shared/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserCredentialsEntity } from './entities/user-credentials.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthOperationResult {
  token: string;
  refreshToken: string;
  user: UserEntity;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
    @InjectRepository(UserCredentialsEntity)
    private readonly userCredentialsRepository: EntityRepository<UserCredentialsEntity>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Validates a user's credentials.
   * @param email - The user's email.
   * @param pass - The user's password.
   * @returns The user entity if credentials are valid, otherwise null.
   */
  async validateUser(email: string, pass: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ email, isActive: true }, { populate: ['credentials'] });

    if (!user) {
      this.logger.warn(`Login attempt failed: User not found for email ${email}`);
      return null;
    }

    if (!user.credentials) {
      this.logger.error(`Credentials not found for user ${email} (ID: ${user.id}) during login attempt.`);
      // This case should ideally not happen if user creation ensures credentials.
      // Throwing an error or returning null depends on how strictly we want to handle this.
      // For security, treating it as invalid credentials is safer.
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.credentials.passwordHash);
    if (isMatch) {
      // Password matches, return user entity (without password or sensitive details not needed by strategy)
      // The LocalStrategy will receive this user object.
      return user;
    }

    this.logger.warn(`Login attempt failed: Invalid password for user ${email}`);
    return null;
  }

  /**
   * Logs in a user and returns tokens and the user entity.
   * @param user - The authenticated user entity.
   * @returns A promise that resolves to an object containing tokens and the user entity.
   */
  async login(user: UserEntity): Promise<AuthOperationResult> {
    // At this point, 'user' is authenticated by LocalStrategy
    // We need to ensure the full user entity with credentials is available if it wasn't fully populated by validateUser
    // or if validateUser returned a partial object.
    // However, our validateUser returns the full entity from userRepository.findOne.

    // User state update (e.g., clearing flags on successful login)
    if (user.oldAccountDeletionNoticeSent) {
      user.oldAccountDeletionNoticeSent = false;
      await this.usersService.save(user);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Ensure user.credentials is loaded. It should be if populated in validateUser.
    if (!user.credentials) {
      // This would be an unexpected state if validateUser worked correctly.
      // So, we can throw an error or handle it gracefully.
      this.logger.error(`User credentials not loaded for user ${user.email} (ID: ${user.id}) during login.`);
      throw new UnauthorizedException('User credentials not found.');
    }

    user.credentials.refreshToken = refreshToken;
    await this.userCredentialsRepository.getEntityManager().persistAndFlush(user.credentials);

    // User entity is returned directly; SessionUserDto construction is moved to controller
    return {
      token,
      refreshToken,
      user,
    };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token.
   * @param token - The refresh token.
   * @returns A promise that resolves to an object containing new tokens and the user entity.
   * @throws UnauthorizedException if the refresh token is invalid or the user is not found/active.
   */
  async refreshTokens(token: string): Promise<AuthOperationResult> {
    const userCredentials = await this.userCredentialsRepository.findOne(
      { refreshToken: token },
      { populate: ['user'] }, // Ensure user is populated
    );

    if (!userCredentials || !userCredentials.user) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.userRepository.findOne(
      {
        id: userCredentials.user.id,
        isActive: true,
      },
      { populate: ['accounts'] },
    );

    if (!user) {
      throw new UnauthorizedException('User not found or not active.');
    }

    // User state update
    if (user.oldAccountDeletionNoticeSent) {
      user.oldAccountDeletionNoticeSent = false;
      await this.usersService.save(user);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const newToken = this.jwtService.sign(payload);
    const newRefreshToken = uuidv4();

    userCredentials.refreshToken = newRefreshToken; // Or await bcrypt.hash(newRefreshToken, 10);
    await this.userCredentialsRepository.getEntityManager().persistAndFlush(userCredentials);

    // User entity is returned directly
    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  /**
   * Logs out a user by invalidating their refresh token.
   * @param userId - The ID of the user to log out.
   * @returns A promise that resolves when the logout process is complete.
   */
  async logout(userId: string): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      // Optionally handle invalid ObjectId string, e.g., log or throw, or just return
      return;
    }
    const userCredentials = await this.userCredentialsRepository.findOne({
      user: new ObjectId(userId),
    });
    if (userCredentials) {
      userCredentials.refreshToken = undefined; // Or null
      await this.userCredentialsRepository.getEntityManager().persistAndFlush(userCredentials);
    }
    // If userCredentials are not found, it might mean the user is already effectively logged out
    // or there's no refresh token to invalidate. No error needs to be thrown.
  }

  /**
   * Registers a new user.
   * @param registerUserDto - DTO containing user registration information.
   * @returns A promise that resolves to an object containing tokens and the new user entity.
   * @throws ConflictException if a user with the given email already exists.
   */
  async registerUser(registerUserDto: RegisterUserDto): Promise<AuthOperationResult> {
    const { email, password, serverURLOnSignUp, timezone } = registerUserDto;

    const existingUser = await this.userRepository.findOne({ email });
    if (existingUser) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const user = this.userRepository.create({
      email,
      serverURLOnSignUp,
      timezone,
      role: UserRole.AccountOwner,
      isActive: true,
      emailVerified: false,
      emailVerificationCode: uuidv4(),
      maxAccounts: 10,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const userCredentials = this.userCredentialsRepository.create({
      passwordHash,
      user,
    });

    try {
      // MikroORM handles cascading persistence if relations are set up correctly.
      // Explicitly persisting user first, then credentials linked to it.
      await this.userRepository.getEntityManager().persistAndFlush(user);
      userCredentials.user = user; // Ensure relation is set
      await this.userCredentialsRepository.getEntityManager().persistAndFlush(userCredentials);

      try {
        if (user.emailVerificationCode) {
          await this.mailService.sendEmailVerificationMail(user, user.emailVerificationCode);
        }
        await this.mailService.sendSignupNotificationMail(user);
        this.logger.log(`User registered: ${user.email}. Verification email sent.`);
      } catch (mailError) {
        this.logger.error(`Failed to send registration related emails for ${user.email}`, mailError.stack);
        // Decide if registration should fail if email sending fails.
        // For now, we log the error and continue, as user is already in DB.
      }
    } catch (error) {
      this.logger.error(`Error during user registration: ${error.message}`, error.stack);
      // Check for specific DB errors if necessary, e.g., unique constraint violation again
      if (error.code === 11000 || error.message?.includes('unique')) {
        throw new ConflictException('A user with this email address already exists.');
      }
      throw error; // Rethrow other errors
    }

    // Log in the user after successful registration
    return this.login(user);
  }

  /**
   * Initiates a password reset request for a user.
   * Generates a reset token and sends a password reset email.
   * @param requestPasswordResetDto - DTO containing the user's email.
   * @returns A promise that resolves when the process is complete.
   */
  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    const { email } = requestPasswordResetDto;
    const user = await this.userRepository.findOne({ email, isActive: true, emailVerified: true });

    if (!user) {
      // Do not reveal if user exists or not for security reasons
      this.logger.log(`Password reset requested for non-existent or inactive/unverified user: ${email}`);
      return;
    }

    user.resetPasswordToken = uuidv4();
    await this.usersService.save(user);

    try {
      if (user.resetPasswordToken) {
        await this.mailService.sendPasswordResetEmail(user, user.resetPasswordToken);
        this.logger.log(`Password reset email sent to ${user.email}.`);
      }
    } catch (mailError) {
      this.logger.error(`Failed to send password reset email to ${user.email}`, mailError.stack);
      // Log error and continue. Token is saved, user can try again or admin can intervene.
    }
  }

  /**
   * Resets a user's password using a reset token.
   * @param resetPasswordDto - DTO containing the reset token and new password.
   * @returns A promise that resolves when the password has been reset.
   * @throws NotFoundException if the token is invalid/expired or user/credentials are not found.
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;
    const user = await this.usersService.findByResetPasswordToken(token);

    if (!user) {
      throw new NotFoundException('Invalid or expired password reset token.');
    }

    if (!user.credentials) {
      this.logger.error(`Credentials not found for user ${user.email} (ID: ${user.id}) during password reset.`);
      throw new NotFoundException('User credentials not found.');
    }

    user.credentials.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined; // Clear the token

    await this.userCredentialsRepository.getEntityManager().persistAndFlush(user.credentials);
    await this.usersService.save(user); // To save the cleared token fields on UserEntity

    this.logger.log(`Password has been reset for user ${user.email}`);
  }

  /**
   * Verifies a user's email address using a verification code.
   * @param verificationCode - The email verification code.
   * @returns A promise that resolves when the email has been verified.
   * @throws NotFoundException if the verification code is invalid or expired.
   */
  async verifyEmail(verificationCode: string): Promise<void> {
    const user = await this.usersService.findByEmailVerificationCode(verificationCode);

    if (!user) {
      throw new NotFoundException('Invalid or expired email verification code.');
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined; // Clear the code
    await this.usersService.save(user);

    this.logger.log(`Email verified for user ${user.email}`);
  }
}
