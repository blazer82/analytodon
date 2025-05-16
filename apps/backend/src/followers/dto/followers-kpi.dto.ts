import { ApiPropertyOptional } from '@nestjs/swagger';

export class FollowersKpiDto {
  @ApiPropertyOptional({ description: 'Followers gained/lost in the current period' })
  currentPeriod?: number;

  @ApiPropertyOptional({ description: 'Progress through the current period (0 to 1)' })
  currentPeriodProgress?: number;

  @ApiPropertyOptional({ description: 'Followers gained/lost in the previous period' })
  previousPeriod?: number;

  @ApiPropertyOptional({ description: 'Indicates if the current period is the full last period' })
  isLastPeriod?: boolean;

  @ApiPropertyOptional({ description: 'Trend compared to the previous period' })
  trend?: number;
}
