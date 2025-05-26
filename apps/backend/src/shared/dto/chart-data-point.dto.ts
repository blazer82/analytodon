import { ApiProperty } from '@nestjs/swagger';

export class ChartDataPointDto {
  @ApiProperty({ example: '2023-10-26', description: 'Date for the data point' })
  time!: string;

  @ApiProperty({ example: 15, description: 'Value for the data point', nullable: true })
  value!: number | null;
}
