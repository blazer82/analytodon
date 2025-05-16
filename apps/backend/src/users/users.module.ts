import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common'; // Import forwardRef

import { UserCredentialsEntity } from '../auth/entities/user-credentials.entity';
import { MailModule } from '../mail/mail.module';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [UserEntity, UserCredentialsEntity],
    }),
    forwardRef(() => MailModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MikroOrmModule],
})
export class UsersModule {}
