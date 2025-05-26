import { AccountCredentialsEntity, AccountEntity, MastodonAppEntity } from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { UsersModule } from '../users/users.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [AccountEntity, AccountCredentialsEntity, MastodonAppEntity],
    }),
    UsersModule,
    SharedModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService, MikroOrmModule],
})
export class AccountsModule {}
