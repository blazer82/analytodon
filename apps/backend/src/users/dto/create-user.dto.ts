import { UserRole } from '@analytodon/shared-orm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { IsValidTimezone } from '../../shared/validators/is-valid-timezone.validator';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'P@$$wOrd123', description: 'User password (at least 8 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.AccountOwner, description: 'User role' })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @ApiPropertyOptional({ example: true, description: 'Is the user account active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional({ example: 10, description: 'Maximum number of accounts the user can create' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxAccounts?: number;

  @ApiPropertyOptional({ example: 'mastodon.social', description: 'Server URL user signed up with' })
  @IsString()
  @IsOptional()
  serverURLOnSignUp?: string;

  @ApiPropertyOptional({ example: 'Europe/Berlin', description: 'User timezone' })
  @IsValidTimezone()
  @IsOptional()
  timezone?: string;
}
