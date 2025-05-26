import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WeeklyStatsMailDto {
  @ApiProperty({ description: 'User ID', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  userID!: string;

  @ApiProperty({
    description: 'Array of Account IDs for which to send weekly stats',
    example: ['60d0fe4f5311236168a109cb', '60d0fe4f5311236168a109cc'],
    type: [String],
  })
  @IsArray()
  @IsMongoId({ each: true })
  accounts!: string[];

  @ApiPropertyOptional({
    description: 'Optional email address to reroute the weekly stats email to',
    example: 'test@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
