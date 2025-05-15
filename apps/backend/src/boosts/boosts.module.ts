import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { TootsModule } from '../toots/toots.module';
import { BoostsController } from './boosts.controller';
import { BoostsService } from './boosts.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [], // DailyTootStatsEntity and TootEntity are expected from TootsModule
    }),
    AccountsModule, // For accessing account information (e.g., timezone, ownership verification)
    TootsModule, // For TootsService and entities (DailyTootStatsEntity, TootEntity)
  ],
  controllers: [BoostsController],
  providers: [BoostsService],
})
export class BoostsModule {}
