import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { TootsModule } from '../toots/toots.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [], // DailyTootStatsEntity and TootEntity are provided by TootsModule
    }),
    forwardRef(() => AccountsModule),
    TootsModule,
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
