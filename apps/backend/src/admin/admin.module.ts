import {
  AccountEntity,
  AccountHealthSnapshotEntity,
  AdminStatsSnapshotEntity,
  SystemHealthSnapshotEntity,
  UserEntity,
} from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminHealthService } from './admin-health.service';
import { AdminSystemHealthService } from './admin-system-health.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [
        AdminStatsSnapshotEntity,
        AccountHealthSnapshotEntity,
        SystemHealthSnapshotEntity,
        AccountEntity,
        UserEntity,
      ],
    }),
    MailModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminHealthService, AdminSystemHealthService, AdminAccountsService],
})
export class AdminModule {}
