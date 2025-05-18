import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AccountEntity } from '../../accounts/entities/account.entity';

export class SessionAccountDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109cb', description: 'Account ID' })
  _id: string;

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

  @ApiProperty({ example: 'Europe/Berlin', description: 'Timezone of the account' })
  timezone: string;

  @ApiProperty({ example: '-04:00', description: 'UTC offset for the timezone' })
  utcOffset: string;

  constructor(account: AccountEntity) {
    this._id = account.id;
    this.serverURL = account.serverURL;
    this.name = account.name;
    this.username = account.username;
    this.accountName = account.accountName;
    this.accountURL = account.accountURL;
    this.avatarURL = account.avatarURL;
    this.timezone = account.timezone;
    this.utcOffset = account.utcOffset;
  }
}
