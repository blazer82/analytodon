import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class StaleAccountMailDto {
  @ApiProperty({ description: 'User ID of the account owner to notify', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  userID!: string;

  @ApiProperty({
    description: 'IDs of the accounts whose stats stopped updating',
    example: ['60d0fe4f5311236168a109cb', '60d0fe4f5311236168a109cc'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  accountIDs!: string[];
}
