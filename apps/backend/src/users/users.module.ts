import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { UserCredentialsEntity } from '../auth/entities/user-credentials.entity';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [UserEntity, UserCredentialsEntity],
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MikroOrmModule],
})
export class UsersModule {}
