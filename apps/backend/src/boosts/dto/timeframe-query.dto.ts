import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TimeframeQueryDto {
  @ApiProperty({
    example: 'last30days',
    description: 'Timeframe for the statistics (e.g., last7days, last30days, thismonth, lastmonth)',
  })
  @IsString()
  @IsNotEmpty()
  timeframe!: string;
}
