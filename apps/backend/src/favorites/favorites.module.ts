import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { TootsModule } from '../toots/toots.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [], // DailyTootStatsEntity and TootEntity are provided by TootsModule
    }),
    AccountsModule,
    TootsModule,
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
