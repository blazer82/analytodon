import { AccountHealthSnapshotEntity, AdminStatsSnapshotEntity } from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AdminHealthService } from './admin-health.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [AdminStatsSnapshotEntity, AccountHealthSnapshotEntity],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminHealthService],
})
export class AdminModule {}
