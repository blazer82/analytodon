import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';

import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { UserCredentialsEntity } from './entities/user-credentials.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
    @InjectRepository(UserCredentialsEntity)
    private readonly userCredentialsRepository: EntityRepository<UserCredentialsEntity>,
  ) {}

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepository.findOne(
      { email: loginDto.email, isActive: true },
      { populate: ['credentials'] },
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.credentials) {
      throw new UnauthorizedException('Credentials not found for this user.');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.credentials.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
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

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4(); // Generate a new refresh token

    // Store the new refresh token (hashed, if preferred, but for now storing directly)
    // For production, consider hashing refresh tokens before storing.
    user.credentials.refreshToken = refreshToken; // Or await bcrypt.hash(refreshToken, 10);
    await this.userCredentialsRepository.getEntityManager().persistAndFlush(user.credentials);

    return {
      accessToken,
      refreshToken,
    };
  }

  // This method could be used by JwtStrategy if we didn't want UsersService directly in strategy
  // async validateUserById(userId: string): Promise<UserEntity | null> {
  //   return this.usersService.findById(userId);
  // }

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
