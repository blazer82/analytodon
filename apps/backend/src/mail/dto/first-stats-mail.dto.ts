import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class FirstStatsMailDto {
  @ApiProperty({ description: 'User ID', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  userID!: string;

  @ApiProperty({
    description: 'Array of Account IDs for which first stats are available',
    example: ['60d0fe4f5311236168a109cb', '60d0fe4f5311236168a109cc'],
    type: [String],
  })
  @IsArray()
  @IsMongoId({ each: true })
  accounts!: string[];
}
