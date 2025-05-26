import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class OldAccountMailDto {
  @ApiProperty({ description: 'User ID for whom to send the old account warning', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  userID!: string;
}
