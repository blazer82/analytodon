import { DailyTootStatsEntity, TootEntity } from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module'; // Import AccountsModule for AccountEntity relation
import { TootsController } from './toots.controller';
import { TootsService } from './toots.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [TootEntity, DailyTootStatsEntity],
    }),
    AccountsModule,
  ],
  controllers: [TootsController],
  providers: [TootsService],
  exports: [TootsService, MikroOrmModule], // Export if entities or repository are needed elsewhere
})
export class TootsModule {}
