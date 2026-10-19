import { ApiProperty } from '@nestjs/swagger';

import { Timeframe } from '../../shared/utils/timeframe.helper';

export class PostingTimeSlotDto {
  @ApiProperty({ example: 1, description: 'ISO weekday the posts were published on (1 = Monday ... 7 = Sunday)' })
  weekday!: number;

  @ApiProperty({ example: 9, description: 'Hour of the day the posts were published in (0-23)' })
  hour!: number;

  @ApiProperty({ example: 4, description: 'Number of posts published in this slot' })
  posts!: number;

  @ApiProperty({ example: 37, description: 'Sum of replies, boosts and favorites of the posts in this slot' })
  engagement!: number;
}

export class PostingTimesResponseDto {
  @ApiProperty({
    type: [PostingTimeSlotDto],
    description: 'Posts and engagement per weekday/hour slot. Slots without posts are omitted (at most 168 entries).',
  })
  data!: PostingTimeSlotDto[];

  @ApiProperty({ example: 'Europe/Berlin', description: 'IANA timezone the weekdays and hours are expressed in' })
  timezone!: string;

  @ApiProperty({ example: 'last30days', description: 'The timeframe used for the aggregation' })
  timeframe!: Timeframe;
}
