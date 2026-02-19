import { HashtagStatsEntity } from '@analytodon/shared-orm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { HashtagsController } from './hashtags.controller';
import { HashtagsService } from './hashtags.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [HashtagStatsEntity],
    }),
    forwardRef(() => AccountsModule),
  ],
  controllers: [HashtagsController],
  providers: [HashtagsService],
  exports: [HashtagsService],
})
export class HashtagsModule {}
