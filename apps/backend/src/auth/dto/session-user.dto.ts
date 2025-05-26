import { UserEntity } from '@analytodon/shared-orm';
import { ApiProperty } from '@nestjs/swagger';

import { SessionAccountDto } from './session-account.dto';

export class SessionUserDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'User ID' })
  _id: string;

  @ApiProperty({
    example: 'account-owner',
    description: 'User role',
  })
  role: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: true,
    description: 'Whether the email has been verified',
  })
  emailVerified: boolean;

  @ApiProperty({ type: [SessionAccountDto], description: 'User accounts' })
  accounts?: SessionAccountDto[];

  @ApiProperty({ example: 10, description: 'Maximum number of accounts allowed' })
  maxAccounts?: number;

  @ApiProperty({ example: 'mastodon.social', description: 'Server URL used during signup' })
  serverURLOnSignUp?: string;

  @ApiProperty({ example: 'Europe/Berlin', description: 'User timezone' })
  timezone?: string;

  constructor(user: UserEntity) {
    this._id = user.id;
    this.role = user.role;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.maxAccounts = user.maxAccounts;
    this.serverURLOnSignUp = user.serverURLOnSignUp;
    this.timezone = user.timezone;

    // Accounts will be populated separately if needed
  }
}
