import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';

import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { TokenResponseDto } from './dto/token-response.dto';
import { UserCredentialsEntity } from './entities/user-credentials.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

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
  ) {}

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

  async login(user: UserEntity): Promise<TokenResponseDto> {
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

    const accessToken = this.jwtService.sign(payload);
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

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(token: string): Promise<TokenResponseDto> {
    const userCredentials = await this.userCredentialsRepository.findOne(
      { refreshToken: token },
      { populate: ['user'] },
    );

    if (!userCredentials || !userCredentials.user) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.userRepository.findOne({
      id: userCredentials.user.id,
      isActive: true,
    });
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

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = uuidv4();

    userCredentials.refreshToken = newRefreshToken; // Or await bcrypt.hash(newRefreshToken, 10);
    await this.userCredentialsRepository.getEntityManager().persistAndFlush(userCredentials);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

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

  // Define other service methods for authentication here
  // e.g., register, password reset, token refresh
}
