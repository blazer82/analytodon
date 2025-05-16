import { ApiPropertyOptional } from '@nestjs/swagger';

export class RepliesKpiDto {
  @ApiPropertyOptional({ description: 'Replies in the current period' })
  currentPeriod?: number;

  @ApiPropertyOptional({ description: 'Progress through the current period (0 to 1)' })
  currentPeriodProgress?: number;

  @ApiPropertyOptional({ description: 'Replies in the previous period' })
  previousPeriod?: number;

  @ApiPropertyOptional({ description: 'Indicates if the current period is the full last period' })
  isLastPeriod?: boolean;

  @ApiPropertyOptional({ description: 'Trend compared to the previous period' })
  trend?: number;
}
