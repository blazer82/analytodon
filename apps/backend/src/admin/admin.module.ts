import {
  AccountEntity,
  DailyAccountStatsEntity,
  DailyTootStatsEntity,
  TootEntity,
  UserEntity,
} from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [UserEntity, AccountEntity, TootEntity, DailyAccountStatsEntity, DailyTootStatsEntity],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
