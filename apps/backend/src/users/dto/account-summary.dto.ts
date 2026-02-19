import { AccountEntity } from '@analytodon/shared-orm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountSummaryDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Account ID' })
  id: string;

  @ApiProperty({ example: 'https://mastodon.social', description: 'Mastodon server URL' })
  serverURL: string;

  @ApiPropertyOptional({ example: '@user@mastodon.social', description: 'Account name on the server' })
  accountName?: string;

  @ApiPropertyOptional({ example: 'user', description: 'Username on the server' })
  username?: string;

  @ApiProperty({ example: true, description: 'Indicates if the account is active' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Indicates if the account setup is complete' })
  setupComplete: boolean;

  @ApiProperty({ description: 'Timestamp of account creation' })
  createdAt: Date;

  constructor(account: AccountEntity) {
    this.id = account.id;
    this.serverURL = account.serverURL;
    this.accountName = account.accountName;
    this.username = account.username;
    this.isActive = account.isActive;
    this.setupComplete = account.setupComplete;
    this.createdAt = account.createdAt;
  }
}
