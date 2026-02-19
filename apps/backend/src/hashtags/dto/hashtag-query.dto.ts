import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class HashtagQueryDto {
  @ApiProperty({
    example: 'last30days',
    description: 'Timeframe for the statistics (e.g., last7days, last30days, thismonth, lastmonth)',
  })
  @IsString()
  @IsNotEmpty()
  timeframe!: string;

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
