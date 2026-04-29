import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class TimeframeQueryDto {
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
}
