import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TootsController } from './toots.controller';
import { TootsService } from './toots.service';
import { TootEntity } from './entities/toot.entity';
import { DailyTootStatsEntity } from './entities/daily-toot-stats.entity';
import { AccountsModule } from '../accounts/accounts.module'; // Import AccountsModule for AccountEntity relation

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
