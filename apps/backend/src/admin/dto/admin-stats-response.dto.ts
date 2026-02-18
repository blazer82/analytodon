import { ApiProperty } from '@nestjs/swagger';

export class DailyCountDto {
  @ApiProperty({ example: '2026-02-01', description: 'Date in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ example: 5, description: 'Count for this date' })
  count: number;
}

export class RoleBreakdownDto {
  @ApiProperty({ example: 2, description: 'Number of admin users' })
  admin: number;

  @ApiProperty({ example: 50, description: 'Number of account owner users' })
  accountOwner: number;
}

export class RegistrationTrendDto {
  @ApiProperty({ example: 15, description: 'Number of registrations in the last 30 days' })
  last30DaysCount: number;

  @ApiProperty({ type: [DailyCountDto], description: 'Daily registration counts for the last 30 days' })
  dailyBreakdown: DailyCountDto[];
}

export class LoginActivityDto {
  @ApiProperty({ example: 10, description: 'Users who logged in during the last 7 days' })
  last7Days: number;

  @ApiProperty({ example: 25, description: 'Users who logged in during the last 30 days' })
  last30Days: number;

  @ApiProperty({ example: 40, description: 'Users who logged in during the last 90 days' })
  last90Days: number;
}

export class UserMetricsDto {
  @ApiProperty({ example: 100, description: 'Total number of users' })
  totalCount: number;

  @ApiProperty({ example: 85, description: 'Number of active users' })
  activeCount: number;

  @ApiProperty({ example: 15, description: 'Number of inactive users' })
  inactiveCount: number;

  @ApiProperty({ example: 90, description: 'Number of users with verified email' })
  emailVerifiedCount: number;

  @ApiProperty({ type: RoleBreakdownDto, description: 'Breakdown of users by role' })
  roleBreakdown: RoleBreakdownDto;

  @ApiProperty({ type: RegistrationTrendDto, description: 'Registration trends over the last 30 days' })
  registrations: RegistrationTrendDto;

  @ApiProperty({ type: LoginActivityDto, description: 'Login activity over various timeframes' })
  loginActivity: LoginActivityDto;
}

export class ServerDistributionDto {
  @ApiProperty({ example: 'mastodon.social', description: 'Mastodon server URL' })
  serverURL: string;

  @ApiProperty({ example: 25, description: 'Number of accounts on this server' })
  count: number;
}

export class AccountMetricsDto {
  @ApiProperty({ example: 150, description: 'Total number of accounts' })
  totalCount: number;

  @ApiProperty({ example: 120, description: 'Number of accounts with setup complete' })
  setupCompleteCount: number;

  @ApiProperty({ example: 30, description: 'Number of accounts with setup incomplete' })
  setupIncompleteCount: number;

  @ApiProperty({ example: 100, description: 'Number of active accounts' })
  activeCount: number;

  @ApiProperty({ example: 50, description: 'Number of inactive accounts' })
  inactiveCount: number;

  @ApiProperty({ type: [ServerDistributionDto], description: 'Distribution of accounts by Mastodon server' })
  serverDistribution: ServerDistributionDto[];
}

export class DataVolumeMetricsDto {
  @ApiProperty({ example: 50000, description: 'Total number of tracked toots' })
  totalToots: number;

  @ApiProperty({ example: 10000, description: 'Total number of daily account stats records' })
  totalDailyAccountStats: number;

  @ApiProperty({ example: 25000, description: 'Total number of daily toot stats records' })
  totalDailyTootStats: number;
}

export class AdminStatsResponseDto {
  @ApiProperty({ type: UserMetricsDto, description: 'User-related metrics' })
  users: UserMetricsDto;

  @ApiProperty({ type: AccountMetricsDto, description: 'Account-related metrics' })
  accounts: AccountMetricsDto;

  @ApiProperty({ type: DataVolumeMetricsDto, description: 'Data volume metrics' })
  dataVolume: DataVolumeMetricsDto;
}
