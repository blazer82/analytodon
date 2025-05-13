import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { DailyAccountStatsEntity } from './entities/daily-account-stats.entity';
import { AccountsModule } from '../accounts/accounts.module'; // Import AccountsModule for AccountEntity relation

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [DailyAccountStatsEntity],
    }),
    AccountsModule,
  ],
  controllers: [FollowersController],
  providers: [FollowersService],
})
export class FollowersModule {}
