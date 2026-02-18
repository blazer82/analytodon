import {
  AccountEntity,
  DailyAccountStatsEntity,
  DailyTootStatsEntity,
  TootEntity,
  UserEntity,
  UserRole,
} from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';

import { AdminStatsResponseDto, DailyCountDto, ServerDistributionDto } from './dto/admin-stats-response.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: EntityRepository<UserEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(TootEntity)
    private readonly tootRepository: EntityRepository<TootEntity>,
    @InjectRepository(DailyAccountStatsEntity)
    private readonly dailyAccountStatsRepository: EntityRepository<DailyAccountStatsEntity>,
    @InjectRepository(DailyTootStatsEntity)
    private readonly dailyTootStatsRepository: EntityRepository<DailyTootStatsEntity>,
  ) {}

  async getStats(): Promise<AdminStatsResponseDto> {
    this.logger.log('Fetching admin platform stats');

    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      // User counts
      totalUsers,
      activeUsers,
      inactiveUsers,
      emailVerifiedUsers,
      adminUsers,
      accountOwnerUsers,
      // Login activity
      loginLast7Days,
      loginLast30Days,
      loginLast90Days,
      // Account counts
      totalAccounts,
      setupCompleteAccounts,
      setupIncompleteAccounts,
      activeAccounts,
      inactiveAccounts,
      // Data volume
      totalToots,
      totalDailyAccountStats,
      totalDailyTootStats,
      // Aggregations
      registrationTrend,
      serverDistribution,
    ] = await Promise.all([
      // User counts
      this.userRepository.count({}),
      this.userRepository.count({ isActive: true }),
      this.userRepository.count({ isActive: false }),
      this.userRepository.count({ emailVerified: true }),
      this.userRepository.count({ role: UserRole.Admin }),
      this.userRepository.count({ role: UserRole.AccountOwner }),
      // Login activity
      this.userRepository.count({ lastLoginAt: { $gte: daysAgo(7) } }),
      this.userRepository.count({ lastLoginAt: { $gte: daysAgo(30) } }),
      this.userRepository.count({ lastLoginAt: { $gte: daysAgo(90) } }),
      // Account counts
      this.accountRepository.count({}),
      this.accountRepository.count({ setupComplete: true }),
      this.accountRepository.count({ setupComplete: false }),
      this.accountRepository.count({ isActive: true }),
      this.accountRepository.count({ isActive: false }),
      // Data volume
      this.tootRepository.count({}),
      this.dailyAccountStatsRepository.count({}),
      this.dailyTootStatsRepository.count({}),
      // Aggregations
      this.getRegistrationTrend(daysAgo(30)),
      this.getServerDistribution(),
    ]);

    const registrationLast30DaysCount = registrationTrend.reduce((sum, day) => sum + day.count, 0);

    return {
      users: {
        totalCount: totalUsers,
        activeCount: activeUsers,
        inactiveCount: inactiveUsers,
        emailVerifiedCount: emailVerifiedUsers,
        roleBreakdown: {
          admin: adminUsers,
          accountOwner: accountOwnerUsers,
        },
        registrations: {
          last30DaysCount: registrationLast30DaysCount,
          dailyBreakdown: registrationTrend,
        },
        loginActivity: {
          last7Days: loginLast7Days,
          last30Days: loginLast30Days,
          last90Days: loginLast90Days,
        },
      },
      accounts: {
        totalCount: totalAccounts,
        setupCompleteCount: setupCompleteAccounts,
        setupIncompleteCount: setupIncompleteAccounts,
        activeCount: activeAccounts,
        inactiveCount: inactiveAccounts,
        serverDistribution,
      },
      dataVolume: {
        totalToots,
        totalDailyAccountStats,
        totalDailyTootStats,
      },
    };
  }

  private async getRegistrationTrend(since: Date): Promise<DailyCountDto[]> {
    const collection = this.userRepository.getEntityManager().getDriver().getConnection().getCollection('users');

    const result = await collection
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    return result.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }

  private async getServerDistribution(): Promise<ServerDistributionDto[]> {
    const collection = this.accountRepository.getEntityManager().getDriver().getConnection().getCollection('accounts');

    const result = await collection
      .aggregate<{
        _id: string;
        count: number;
      }>([{ $group: { _id: '$serverURL', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }])
      .toArray();

    return result.map((item) => ({
      serverURL: item._id,
      count: item.count,
    }));
  }
}
