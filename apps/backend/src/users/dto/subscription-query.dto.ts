import { ApiProperty } from '@nestjs/swagger';
// Assuming user IDs are Mongo ObjectIds. If UUIDs, use IsUUID.
import { IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';

export class ManageSubscriptionDto {
  @ApiProperty({ description: 'User ID', example: '60d0fe4f5311236168a109ca' })
  @IsMongoId()
  @IsNotEmpty()
  u!: string; // User ID

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  e!: string; // Email
}
