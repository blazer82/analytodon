import { AdminStatsSnapshotEntity } from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [AdminStatsSnapshotEntity],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
