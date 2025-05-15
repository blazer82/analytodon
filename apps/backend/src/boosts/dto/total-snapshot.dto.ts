import { ApiProperty } from '@nestjs/swagger';

export class TotalSnapshotDto {
  @ApiProperty({ example: 1250, description: 'Total cumulative count of boosts' })
  amount!: number;

  @ApiProperty({ description: 'Date of the last data entry' })
  day!: Date;
}
