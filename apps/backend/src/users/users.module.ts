import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { UserCredentialsEntity } from '../auth/entities/user-credentials.entity';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      // UserCredentialsEntity might be needed here if UsersService manages it directly
      // or if there are direct relations from UserEntity that need to be resolved.
      // For now, UserEntity is primary.
      entities: [UserEntity, UserCredentialsEntity],
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MikroOrmModule], // Export UsersService for AuthModule
})
export class UsersModule {}
