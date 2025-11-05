import { RefreshTokenEntity, UserCredentialsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import ms from 'ms';
import { v4 as uuidv4 } from 'uuid';

import { MailService } from '../mail/mail.service';
import { authConstants } from '../shared/constants/auth.constants';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface AuthOperationResult {
  token: string;
  refreshToken: string;
  user: UserEntity;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supportedLocales = ['en', 'de']; // Should match i18n config

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
    @InjectRepository(UserCredentialsEntity)
    private readonly userCredentialsRepository: EntityRepository<UserCredentialsEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: EntityRepository<RefreshTokenEntity>,
    @Inject(forwardRef(() => MailService)) private readonly mailService: MailService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Extract locale from Accept-Language header
   * Returns the first supported language or undefined
   */
  extractLocaleFromHeader(acceptLanguage?: string): string | undefined {
    if (!acceptLanguage) return undefined;

    // Parse Accept-Language header (e.g., "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7")
    const locales = acceptLanguage.split(',').map((lang) => {
      const [locale] = lang.split(';');
      return locale.trim().toLowerCase().split('-')[0]; // Get language code only
    });

    // Find first supported locale
    return locales.find((locale) => this.supportedLocales.includes(locale));
  }

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
   * @param locale - Optional locale to update user's language preference.
   * @returns A promise that resolves to an object containing tokens and the user entity.
   */
  async login(user: UserEntity, locale?: string): Promise<AuthOperationResult> {
    // At this point, 'user' is authenticated by LocalStrategy
    // We need to ensure the full user entity with credentials is available if it wasn't fully populated by validateUser
    // or if validateUser returned a partial object.
    // However, our validateUser returns the full entity from userRepository.findOne.

    // User state update (e.g., clearing flags on successful login)
    if (user.oldAccountDeletionNoticeSent) {
      user.oldAccountDeletionNoticeSent = false;
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();

    // Update locale if provided
    if (locale) {
      user.locale = locale;
    }

    await this.usersService.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);
    const refreshTokenString = uuidv4();

    const expiresInSeconds = this.configService.get<string>(
      authConstants.JWT_EXPIRES_IN_KEY,
      authConstants.JWT_DEFAULT_EXPIRES_IN,
    );
    let expiresInNumeric: number;
    if (typeof expiresInSeconds === 'string') {
      try {
        expiresInNumeric = ms(expiresInSeconds) / 1000;
      } catch (_e) {
        this.logger.warn(`Invalid JWT_EXPIRES_IN format: ${expiresInSeconds}. Falling back to default.`);
        expiresInNumeric = authConstants.JWT_DEFAULT_EXPIRES_IN_SECONDS;
      }
    } else if (typeof expiresInSeconds === 'number') {
      // Assuming if it's a number, it's already in seconds as per previous logic/constants
      expiresInNumeric = expiresInSeconds;
    } else {
      expiresInNumeric = authConstants.JWT_DEFAULT_EXPIRES_IN_SECONDS;
    }

    // Create and store the new refresh token
    const refreshTokenExpiresIn = this.configService.get<string>(
      authConstants.JWT_REFRESH_TOKEN_EXPIRES_IN_KEY,
      authConstants.JWT_DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
    );
    const expiresAt = new Date();
    // Simple parsing for '7d' format, more robust parsing might be needed for other formats
    const daysMatch = refreshTokenExpiresIn.match(/^(\d+)d$/);
    if (daysMatch) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1], 10));
    } else {
      // Default to 7 days if format is unrecognized
      this.logger.warn(`Unrecognized refresh token expiry format: ${refreshTokenExpiresIn}. Defaulting to 7 days.`);
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    const newRefreshToken = this.refreshTokenRepository.create({
      token: refreshTokenString,
      user,
      expiresAt,
    });
    await this.refreshTokenRepository.getEntityManager().persistAndFlush(newRefreshToken);

    // User entity is returned directly; SessionUserDto construction is moved to controller
    return {
      token,
      refreshToken: refreshTokenString,
      user,
      expiresIn: expiresInNumeric,
    };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token.
   * @param token - The refresh token.
   * @param locale - Optional locale to update user's language preference.
   * @returns A promise that resolves to an object containing new tokens and the user entity.
   * @throws UnauthorizedException if the refresh token is invalid, expired, or the user is not found/active.
   */
  async refreshTokens(token: string, locale?: string): Promise<AuthOperationResult> {
    const refreshTokenEntity = await this.refreshTokenRepository.findOne(
      { token },
      { populate: ['user', 'user.accounts'] },
    );

    if (!refreshTokenEntity) {
      this.logger.warn(`Refresh token not found: ${token}`);
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (refreshTokenEntity.expiresAt < new Date()) {
      this.logger.warn(`Expired refresh token used: ${token} by user ${refreshTokenEntity.user.id}`);
      await this.refreshTokenRepository.getEntityManager().removeAndFlush(refreshTokenEntity);
      throw new UnauthorizedException('Refresh token expired.');
    }

    const user = refreshTokenEntity.user;
    if (!user.isActive) {
      this.logger.warn(`User ${user.id} is inactive, token refresh denied.`);
      throw new UnauthorizedException('User not active.');
    }

    // User state update
    if (user.oldAccountDeletionNoticeSent) {
      user.oldAccountDeletionNoticeSent = false;
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();

    // Update locale if provided
    if (locale) {
      user.locale = locale;
    }

    // Note: user is already populated from refreshTokenEntity, so direct save is fine.
    await this.usersService.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshTokenString = uuidv4();

    const expiresInSeconds = this.configService.get<string>(
      authConstants.JWT_EXPIRES_IN_KEY,
      authConstants.JWT_DEFAULT_EXPIRES_IN,
    );
    let expiresInNumeric: number;
    if (typeof expiresInSeconds === 'string') {
      try {
        expiresInNumeric = ms(expiresInSeconds) / 1000;
      } catch (_e) {
        this.logger.warn(`Invalid JWT_EXPIRES_IN format: ${expiresInSeconds}. Falling back to default.`);
        expiresInNumeric = authConstants.JWT_DEFAULT_EXPIRES_IN_SECONDS;
      }
    } else if (typeof expiresInSeconds === 'number') {
      expiresInNumeric = expiresInSeconds;
    } else {
      expiresInNumeric = authConstants.JWT_DEFAULT_EXPIRES_IN_SECONDS;
    }

    // Remove old refresh token
    await this.refreshTokenRepository.getEntityManager().removeAndFlush(refreshTokenEntity);

    // Create and store the new refresh token
    const refreshTokenExpiresIn = this.configService.get<string>(
      authConstants.JWT_REFRESH_TOKEN_EXPIRES_IN_KEY,
      authConstants.JWT_DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
    );
    const expiresAt = new Date();
    const daysMatch = refreshTokenExpiresIn.match(/^(\d+)d$/);
    if (daysMatch) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1], 10));
    } else {
      this.logger.warn(`Unrecognized refresh token expiry format: ${refreshTokenExpiresIn}. Defaulting to 7 days.`);
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    const newRefreshTokenEntity = this.refreshTokenRepository.create({
      token: newRefreshTokenString,
      user,
      expiresAt,
    });
    await this.refreshTokenRepository.getEntityManager().persistAndFlush(newRefreshTokenEntity);

    // User entity is returned directly
    return {
      token: newAccessToken,
      refreshToken: newRefreshTokenString,
      user,
      expiresIn: expiresInNumeric,
    };
  }

  /**
   * Logs out a user by invalidating their refresh token.
   * @param userId - The ID of the user to log out.
   * @returns A promise that resolves when the logout process is complete.
   */
  async logout(userId: string): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      this.logger.warn(`Logout attempt with invalid userId format: ${userId}`);
      return;
    }
    // Invalidate all refresh tokens for the user
    const user = await this.userRepository.findOne(userId, { populate: ['refreshTokens'] });
    if (user && user.refreshTokens.isInitialized()) {
      const tokensToRemove = user.refreshTokens.getItems();
      if (tokensToRemove.length > 0) {
        this.logger.log(`Logging out user ${userId}, removing ${tokensToRemove.length} refresh tokens.`);
        for (const token of tokensToRemove) {
          this.em.remove(token);
        }
        await this.em.flush();
      }
    } else if (user) {
      // If refreshTokens collection is not initialized, load it and then remove.
      // This path might be less common if user object from GetUser decorator already has it.
      await user.refreshTokens.init();
      const tokensToRemove = user.refreshTokens.getItems();
      if (tokensToRemove.length > 0) {
        this.logger.log(`Logging out user ${userId}, removing ${tokensToRemove.length} refresh tokens (post-init).`);
        for (const token of tokensToRemove) {
          this.em.remove(token);
        }
        await this.em.flush();
      }
    } else {
      this.logger.log(`Logout attempt for user ${userId}, but user not found. No action taken.`);
    }
  }

  /**
   * Registers a new user.
   * @param registerUserDto - DTO containing user registration information.
   * @returns A promise that resolves to an object containing tokens and the new user entity.
   * @throws ConflictException if a user with the given email already exists.
   * @throws ForbiddenException if new registrations are disabled.
   */
  async registerUser(registerUserDto: RegisterUserDto, detectedLocale?: string): Promise<AuthOperationResult> {
    const isRegistrationDisabled = this.configService.get<string>('DISABLE_NEW_REGISTRATIONS') === 'true';
    if (isRegistrationDisabled) {
      throw new ForbiddenException('New registrations are currently disabled.');
    }

    const { email, password, serverURLOnSignUp, timezone, locale } = registerUserDto;

    const existingUser = await this.userRepository.findOne({ email });
    if (existingUser) {
      throw new ConflictException('A user with this email address already exists.');
    }

    // Priority: explicit locale from DTO > detected locale from header > default to 'en'
    const finalLocale = locale || detectedLocale || 'en';

    const user = this.userRepository.create({
      email,
      serverURLOnSignUp,
      timezone,
      locale: finalLocale,
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

    // Log in the user after successful registration, passing the locale for consistency
    return this.login(user, finalLocale);
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
