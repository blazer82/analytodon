import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { TootsModule } from '../toots/toots.module';
import { RepliesController } from './replies.controller';
import { RepliesService } from './replies.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [], // DailyTootStatsEntity and TootEntity are provided by TootsModule
    }),
    forwardRef(() => AccountsModule),
    TootsModule,
  ],
  controllers: [RepliesController],
  providers: [RepliesService],
  exports: [RepliesService],
})
export class RepliesModule {}
