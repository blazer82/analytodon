import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RepliesController } from './replies.controller';
import { RepliesService } from './replies.service';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [], // Add Reply-related entities here
    }),
  ],
  controllers: [RepliesController],
  providers: [RepliesService],
})
export class RepliesModule {}
