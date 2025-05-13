import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { BoostsController } from './boosts.controller';
import { BoostsService } from './boosts.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [], // Add Boost-related entities here
    }),
  ],
  controllers: [BoostsController],
  providers: [BoostsService],
})
export class BoostsModule {}
