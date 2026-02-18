import { AccountHealthSnapshotEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';

import { AccountHealthResponseDto } from './dto/account-health-response.dto';

@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  constructor(
    @InjectRepository(AccountHealthSnapshotEntity)
    private readonly snapshotRepository: EntityRepository<AccountHealthSnapshotEntity>,
  ) {}

  async getAccountHealth(): Promise<AccountHealthResponseDto> {
    this.logger.log('Fetching account health snapshot');

    const [snapshot] = await this.snapshotRepository.find(
      { generatedAt: { $ne: null } },
      { orderBy: { generatedAt: 'DESC' }, limit: 1 },
    );

    if (!snapshot) {
      this.logger.warn('No account health snapshot found');
      return this.getEmptyHealth();
    }

    return {
      generatedAt: snapshot.generatedAt.toISOString(),
      ...(snapshot.data as Omit<AccountHealthResponseDto, 'generatedAt'>),
    };
  }

  private getEmptyHealth(): AccountHealthResponseDto {
    return {
      staleAccounts: [],
      incompleteAccounts: [],
      abandonedAccounts: [],
    };
  }
}
