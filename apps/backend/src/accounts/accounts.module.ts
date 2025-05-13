import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module'; // Import UsersModule for UserEntity relation
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountCredentialsEntity } from './entities/account-credentials.entity';
import { AccountEntity } from './entities/account.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [AccountEntity, AccountCredentialsEntity],
    }),
    UsersModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService, MikroOrmModule], // Export if AccountEntity or its repository is needed elsewhere
})
export class AccountsModule {}
