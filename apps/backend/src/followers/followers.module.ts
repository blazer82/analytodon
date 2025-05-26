import { DailyAccountStatsEntity } from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module'; // Import AccountsModule for AccountEntity relation
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [DailyAccountStatsEntity],
    }),
    forwardRef(() => AccountsModule),
  ],
  controllers: [FollowersController],
  providers: [FollowersService],
  exports: [FollowersService],
})
export class FollowersModule {}
