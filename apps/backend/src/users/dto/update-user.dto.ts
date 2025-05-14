import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { UserRole } from '../../shared/enums/user-role.enum';
import { IsValidTimezone } from '../../shared/validators/is-valid-timezone.validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'updateduser@example.com', description: 'User email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'NewP@$$wOrd123',
    description: 'New user password (at least 8 characters)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.Admin, description: 'User role', required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: false, description: 'Is the user account active?', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Is the user email verified?', required: false })
  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Maximum number of accounts the user can create', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxAccounts?: number;

  @ApiPropertyOptional({ example: 'mastodon.online', description: 'Server URL user signed up with', required: false })
  @IsString()
  @IsOptional()
  serverURLOnSignUp?: string;

  @ApiPropertyOptional({ example: 'America/New_York', description: 'User timezone', required: false })
  @IsValidTimezone()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: ['news'], description: 'List of unsubscribed email types', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  unsubscribed?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Has the old account deletion notice been sent?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  oldAccountDeletionNoticeSent?: boolean;
}
