import { AccountEntity } from '@analytodon/shared-orm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109cb', description: 'Account ID' })
  id: string;

  @ApiProperty({ example: 'mastodon.social', description: 'Mastodon server URL' })
  serverURL: string;

  @ApiPropertyOptional({ example: 'My Mastodon Account', description: 'Account display name' })
  name?: string;

  @ApiPropertyOptional({ example: 'john_doe', description: 'Mastodon username' })
  username?: string;

  @ApiPropertyOptional({ example: '@john_doe@mastodon.social', description: 'Full account name' })
  accountName?: string;

  @ApiPropertyOptional({ example: 'https://mastodon.social/@john_doe', description: 'Mastodon account URL' })
  accountURL?: string;

  @ApiPropertyOptional({ example: 'https://files.mastodon.social/accounts/avatars/...', description: 'Avatar URL' })
  avatarURL?: string;

  @ApiProperty({ example: true, description: 'Is the account currently active?' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Has the account setup been completed?' })
  setupComplete: boolean;

  @ApiProperty({ example: 'Europe/Berlin', description: 'Timezone of the account' })
  timezone: string;

  @ApiPropertyOptional({ example: ['read:accounts', 'read:statuses'], description: 'OAuth scopes granted' })
  requestedScope?: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  constructor(account: AccountEntity) {
    this.id = account.id;
    this.serverURL = account.serverURL;
    this.name = account.name;
    this.username = account.username;
    this.accountName = account.accountName;
    this.accountURL = account.accountURL;
    this.avatarURL = account.avatarURL;
    this.isActive = account.isActive;
    this.setupComplete = account.setupComplete;
    this.timezone = account.timezone;
    this.requestedScope = account.requestedScope;
    this.createdAt = account.createdAt;
    this.updatedAt = account.updatedAt;
  }
}
