import { ApiProperty } from '@nestjs/swagger';

import { Timeframe } from '../../shared/utils/timeframe.helper'; // Assuming Timeframe type is exported
import { RankedTootDto } from './ranked-toot.dto';

class TopTootsCategoryDto {
  @ApiProperty({ type: [RankedTootDto], description: 'List of ranked toots' })
  data!: RankedTootDto[];

  @ApiProperty({ example: 'last30days', description: 'The timeframe used for fetching these toots' })
  timeframe!: Timeframe;
}

export class AllTopTootsResponseDto {
  @ApiProperty({ type: TopTootsCategoryDto, description: 'Top toots based on combined replies and boosts' })
  top!: TopTootsCategoryDto;

  @ApiProperty({ type: TopTootsCategoryDto, description: 'Top toots ranked by replies' })
  topByReplies!: TopTootsCategoryDto;

  @ApiProperty({ type: TopTootsCategoryDto, description: 'Top toots ranked by boosts (reblogs)' })
  topByBoosts!: TopTootsCategoryDto;

  @ApiProperty({ type: TopTootsCategoryDto, description: 'Top toots ranked by favourites' })
  topByFavorites!: TopTootsCategoryDto;
}
