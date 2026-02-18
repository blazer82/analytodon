import { AdminStatsSnapshotEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';

import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(AdminStatsSnapshotEntity)
    private readonly snapshotRepository: EntityRepository<AdminStatsSnapshotEntity>,
  ) {}

  async getStats(): Promise<AdminStatsResponseDto> {
    this.logger.log('Fetching admin platform stats from snapshot');

    const [snapshot] = await this.snapshotRepository.find(
      { generatedAt: { $ne: null } },
      { orderBy: { generatedAt: 'DESC' }, limit: 1 },
    );

    if (!snapshot) {
      this.logger.warn('No admin stats snapshot found');
      return this.getEmptyStats();
    }

    return {
      generatedAt: snapshot.generatedAt.toISOString(),
      ...(snapshot.data as Omit<AdminStatsResponseDto, 'generatedAt'>),
    };
  }

  private getEmptyStats(): AdminStatsResponseDto {
    return {
      users: {
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        emailVerifiedCount: 0,
        roleBreakdown: { admin: 0, accountOwner: 0 },
        registrations: { last30DaysCount: 0, dailyBreakdown: [] },
        loginActivity: { last7Days: 0, last30Days: 0, last90Days: 0 },
      },
      accounts: {
        totalCount: 0,
        setupCompleteCount: 0,
        setupIncompleteCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        serverDistribution: [],
      },
      dataVolume: {
        totalToots: 0,
        totalDailyAccountStats: 0,
        totalDailyTootStats: 0,
      },
    };
  }
}
