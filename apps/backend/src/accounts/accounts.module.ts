import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from '../users/users.module';
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
    ConfigModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService, MikroOrmModule],
})
export class AccountsModule {}
