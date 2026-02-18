import { SystemHealthSnapshotEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';

import { SystemHealthResponseDto } from './dto/system-health-response.dto';

@Injectable()
export class AdminSystemHealthService {
  private readonly logger = new Logger(AdminSystemHealthService.name);

  constructor(
    @InjectRepository(SystemHealthSnapshotEntity)
    private readonly snapshotRepository: EntityRepository<SystemHealthSnapshotEntity>,
  ) {}

  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    this.logger.log('Fetching system health snapshot');

    const [snapshot] = await this.snapshotRepository.find(
      { generatedAt: { $ne: null } },
      { orderBy: { generatedAt: 'DESC' }, limit: 1 },
    );

    if (!snapshot) {
      this.logger.warn('No system health snapshot found');
      return this.getEmptyHealth();
    }

    return {
      generatedAt: snapshot.generatedAt.toISOString(),
      ...(snapshot.data as Omit<SystemHealthResponseDto, 'generatedAt'>),
    };
  }

  private getEmptyHealth(): SystemHealthResponseDto {
    return {
      jobStatuses: [],
      dataFreshness: {
        dailyAccountStats: { latestDate: null, isStale: true },
        dailyTootStats: { latestDate: null, isStale: true },
        toots: { latestFetchedAt: null, isStale: true },
      },
      collectionSizes: {
        users: 0,
        accounts: 0,
        toots: 0,
        dailyAccountStats: 0,
        dailyTootStats: 0,
        refreshTokens: 0,
        mastodonApps: 0,
        cliJobRuns: 0,
      },
      timingMargins: [],
      recentFailures: [],
    };
  }
}
