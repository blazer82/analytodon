import { ApiProperty } from '@nestjs/swagger';

export class StaleAccountDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Account ID' })
  accountId: string;

  @ApiProperty({ example: 'user@mastodon.social', description: 'Mastodon account name', nullable: true })
  accountName: string | null;

  @ApiProperty({ example: 'mastodon.social', description: 'Mastodon server URL' })
  serverURL: string;

  @ApiProperty({ example: 'owner@example.com', description: 'Account owner email' })
  ownerEmail: string;

  @ApiProperty({
    example: '2026-02-10T00:00:00.000Z',
    description: 'Last stats collection date',
    nullable: true,
  })
  lastStatsDate: string | null;

  @ApiProperty({ example: 8, description: 'Days since last stats update' })
  daysSinceLastUpdate: number;
}

export class IncompleteAccountDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Account ID' })
  accountId: string;

  @ApiProperty({
    example: 'user@mastodon.social',
    description: 'Mastodon account name (may not be set yet)',
    nullable: true,
  })
  accountName: string | null;

  @ApiProperty({ example: 'mastodon.social', description: 'Mastodon server URL' })
  serverURL: string;

  @ApiProperty({ example: 'owner@example.com', description: 'Account owner email' })
  ownerEmail: string;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z', description: 'Account creation date' })
  createdDate: string;

  @ApiProperty({ example: 34, description: 'Days since account was created' })
  daysSinceCreation: number;
}

export class AbandonedAccountDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Account ID' })
  accountId: string;

  @ApiProperty({ example: 'user@mastodon.social', description: 'Mastodon account name' })
  accountName: string | null;

  @ApiProperty({ example: 'mastodon.social', description: 'Mastodon server URL' })
  serverURL: string;

  @ApiProperty({ example: 'owner@example.com', description: 'Account owner email' })
  ownerEmail: string;

  @ApiProperty({
    example: '2025-10-01T00:00:00.000Z',
    description: 'Last login date of the owner',
    nullable: true,
  })
  lastLoginDate: string | null;

  @ApiProperty({ example: false, description: 'Whether a deletion notice has been sent' })
  deletionNoticeSent: boolean;
}

export class AccountHealthResponseDto {
  @ApiProperty({
    example: '2026-02-18T03:00:00.000Z',
    description: 'When the health snapshot was generated',
    required: false,
  })
  generatedAt?: string;

  @ApiProperty({ type: [StaleAccountDto], description: 'Accounts with stale data collection' })
  staleAccounts: StaleAccountDto[];

  @ApiProperty({ type: [IncompleteAccountDto], description: 'Accounts with incomplete setup' })
  incompleteAccounts: IncompleteAccountDto[];

  @ApiProperty({
    type: [AbandonedAccountDto],
    description: 'Accounts belonging to users who have not logged in recently',
  })
  abandonedAccounts: AbandonedAccountDto[];
}
