import { UserEntity, UserRole } from '@analytodon/shared-orm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AccountSummaryDto } from './account-summary.dto';

export class UserResponseDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'User ID' })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.AccountOwner,
    description: 'User role',
  })
  role: UserRole;

  @ApiProperty({
    example: true,
    description: 'Indicates if the user account is active',
  })
  isActive: boolean;

  @ApiProperty({ description: 'Timestamp of user creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp of last user update' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: true, description: 'Indicates if the user email is verified' })
  emailVerified?: boolean;

  @ApiPropertyOptional({ description: 'Timestamp of last user login' })
  lastLoginAt?: Date;

  @ApiPropertyOptional({ example: 'Europe/Berlin', description: 'User timezone' })
  timezone?: string;

  @ApiPropertyOptional({ example: 'en', description: 'User locale' })
  locale?: string;

  @ApiPropertyOptional({ example: 5, description: 'Maximum number of accounts the user can create' })
  maxAccounts?: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of accounts the user has' })
  accountsCount?: number;

  @ApiPropertyOptional({ type: () => [AccountSummaryDto], description: 'User accounts' })
  accounts?: AccountSummaryDto[];

  constructor(user: UserEntity) {
    this.id = user.id;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.emailVerified = user.emailVerified;
    this.lastLoginAt = user.lastLoginAt;
    this.timezone = user.timezone;
    this.locale = user.locale;
    this.maxAccounts = user.maxAccounts;

    if (user.accounts?.isInitialized()) {
      const accountItems = user.accounts.getItems();
      this.accountsCount = accountItems.length;
      this.accounts = accountItems.map((account) => new AccountSummaryDto(account));
    }
  }
}
