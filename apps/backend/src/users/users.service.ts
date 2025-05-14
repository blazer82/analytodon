import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ObjectId } from 'bson';

import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return this.userRepository.findOne({
      _id: new ObjectId(id),
      isActive: true,
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ email, isActive: true });
  }

  async findByEmailVerificationCode(code: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ emailVerificationCode: code, isActive: true });
  }

  async findByResetPasswordToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ resetPasswordToken: token, isActive: true });
  }

  async save(user: UserEntity): Promise<UserEntity> {
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }
}
