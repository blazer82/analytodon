import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/mongodb';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ObjectId } from 'bson';

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
    return this.userRepository.findOne({ _id: new ObjectId(id), isActive: true });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ email, isActive: true });
  }

  async save(user: UserEntity): Promise<UserEntity> {
    await this.userRepository.persistAndFlush(user);
    return user;
  }

  // Define other service methods for user management here
  // e.g., updateUser, createUser (if not in auth)
}
