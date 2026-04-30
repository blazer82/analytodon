import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AdminSendWeeklyStatsDto {
  @ApiProperty({ description: 'Target user ID whose weekly stats to send', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  userId!: string;
}
