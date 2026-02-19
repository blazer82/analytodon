import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAccountOwnerDto {
  @ApiProperty({ description: 'Owner user ID' })
  id: string;

  @ApiProperty({ description: 'Owner email address' })
  email: string;
}

export class AdminAccountItemDto {
  @ApiProperty({ description: 'Account ID' })
  id: string;

  @ApiProperty({ description: 'Mastodon server URL' })
  serverURL: string;

  @ApiPropertyOptional({ description: 'Account name (e.g. @user@server)' })
  accountName?: string;

  @ApiPropertyOptional({ description: 'Username on the Mastodon server' })
  username?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarURL?: string;

  @ApiProperty({ description: 'Whether the account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether account setup is complete' })
  setupComplete: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Account owner info', type: AdminAccountOwnerDto })
  owner: AdminAccountOwnerDto;
}
