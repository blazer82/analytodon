import { ApiProperty } from '@nestjs/swagger';

import { ChartDataPointDto } from '../../shared/dto/chart-data-point.dto';

export enum PostActivityBucketEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class BusiestDayDto {
  @ApiProperty({ example: '2026-09-09', description: 'Day (YYYY-MM-DD, account timezone) with the most posts' })
  date!: string;

  @ApiProperty({ example: 4, description: 'Number of posts on that day' })
  count!: number;
}

export class PostActivityDto {
  @ApiProperty({ example: 40, description: 'Number of posts in the selected period' })
  total!: number;

  @ApiProperty({
    example: 36,
    description:
      'Number of posts in the period with the same number of days immediately before the selected period. ' +
      'While the selected period is in progress, only counts up to the same elapsed time into that period.',
  })
  previousPeriodTotal!: number;

  @ApiProperty({
    example: false,
    description: 'Whether the selected period has not ended yet (e.g. "this month")',
  })
  inProgress!: boolean;

  @ApiProperty({
    example: 0.11,
    description: 'Relative change vs. the previous period (0.11 = +11%). Null when the previous period has no posts.',
    nullable: true,
    type: Number,
  })
  trend!: number | null;

  @ApiProperty({
    enum: PostActivityBucketEnum,
    enumName: 'PostActivityBucket',
    example: PostActivityBucketEnum.DAY,
    description: 'Size of each chart bucket, derived from the length of the period',
  })
  bucket!: PostActivityBucketEnum;

  @ApiProperty({
    type: [ChartDataPointDto],
    description: 'Zero-filled post counts per bucket. `time` is the first day of the bucket (YYYY-MM-DD).',
  })
  chart!: ChartDataPointDto[];

  @ApiProperty({ example: '2026-09-01', description: 'First day of the period (YYYY-MM-DD, account timezone)' })
  dateFrom!: string;

  @ApiProperty({ example: '2026-09-30', description: 'Last day of the period, inclusive (YYYY-MM-DD)' })
  dateTo!: string;

  @ApiProperty({ example: 30, description: 'Number of calendar days in the period' })
  days!: number;

  @ApiProperty({ example: 6, description: 'Number of days in the period without any post' })
  daysWithoutPosts!: number;

  @ApiProperty({ type: BusiestDayDto, nullable: true, description: 'Day with the most posts, null if no posts' })
  busiestDay!: BusiestDayDto | null;
}
