import {
  AccountHealthSnapshotEntity,
  AdminStatsSnapshotEntity,
  SystemHealthSnapshotEntity,
} from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AdminHealthService } from './admin-health.service';
import { AdminSystemHealthService } from './admin-system-health.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [AdminStatsSnapshotEntity, AccountHealthSnapshotEntity, SystemHealthSnapshotEntity],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminHealthService, AdminSystemHealthService],
})
export class AdminModule {}
