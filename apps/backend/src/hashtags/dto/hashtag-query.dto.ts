import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class HashtagQueryDto {
  @ApiProperty({
    example: 'last30days',
    description:
      'Timeframe for the statistics (e.g., last7days, last30days, thismonth, lastmonth, custom). When "custom", dateFrom and dateTo are required.',
  })
  @IsString()
  @IsNotEmpty()
  timeframe!: string;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD) for custom timeframe',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2024-03-31',
    description: 'End date (YYYY-MM-DD) for custom timeframe',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Maximum number of hashtags to return (default 10, max 25)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  @Type(() => Number)
  limit?: number;
}

export class HashtagEffectiveQueryDto extends HashtagQueryDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum number of toots a hashtag must have to be included (default 2)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minTootCount?: number;
}
