import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'P@$$wOrd123',
    description: 'User password (at least 8 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    example: 'mastodon.social',
    description: 'Server URL user signed up with (optional)',
  })
  @IsOptional()
  @IsString()
  serverURLOnSignUp?: string;

  @ApiPropertyOptional({
    example: 'Europe/Berlin',
    description: 'User timezone (optional)',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
