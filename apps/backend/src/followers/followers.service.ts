import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { AccountsService } from '../accounts/accounts.service';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ChartDataPointDto } from '../boosts/dto/chart-data-point.dto';
import { TotalSnapshotDto } from '../boosts/dto/total-snapshot.dto';
import {
  formatDateISO,
  getDaysToMonthBeginning,
  getDaysToWeekBeginning,
  getDaysToYearBeginning,
  getKPITrend,
  getPeriodKPI,
  resolveTimeframe,
} from '../shared/utils/timeframe.helper';
import { UserEntity } from '../users/entities/user.entity';
import { FollowersKpiDto } from './dto/followers-kpi.dto';
import { DailyAccountStatsEntity } from './entities/daily-account-stats.entity';

@Injectable()
export class FollowersService {
  private readonly logger = new Logger(FollowersService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(DailyAccountStatsEntity)
    private readonly dailyAccountStatsRepository: EntityRepository<DailyAccountStatsEntity>,
    private readonly accountsService: AccountsService,
  ) {}

  private async getAccountOrFail(accountId: string, user: UserEntity): Promise<Loaded<AccountEntity>> {
    const account = await this.accountsService.findById(accountId, user);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found or not owned by user.`);
    }
    if (!account.setupComplete) {
      throw new NotFoundException(`Account with ID ${accountId} setup is not complete.`);
    }
    return account;
  }

  async getWeeklyKpi(accountId: string, user: UserEntity): Promise<FollowersKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyAccountStatsRepository,
      account.id,
      account.timezone,
      getDaysToWeekBeginning,
      'followersCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getMonthlyKpi(accountId: string, user: UserEntity): Promise<FollowersKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyAccountStatsRepository,
      account.id,
      account.timezone,
      getDaysToMonthBeginning,
      'followersCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getYearlyKpi(accountId: string, user: UserEntity): Promise<FollowersKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyAccountStatsRepository,
      account.id,
      account.timezone,
      getDaysToYearBeginning,
      'followersCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getTotalSnapshot(accountId: string, user: UserEntity): Promise<TotalSnapshotDto | null> {
    const account = await this.getAccountOrFail(accountId, user);
    const entry = await this.dailyAccountStatsRepository.findOne({ account: account.id }, { orderBy: { day: 'DESC' } });
    if (entry) {
      return {
        amount: entry.followersCount,
        day: entry.day,
      };
    }
    return null;
  }

  async getChartData(accountId: string, timeframe: string, user: UserEntity): Promise<ChartDataPointDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    const data = await this.dailyAccountStatsRepository.find(
      { account: account.id, day: { $gte: dateFrom, $lte: dateTo } },
      { orderBy: { day: 'ASC' } },
    );

    return data.map((entry) => ({
      time: formatDateISO(entry.day, account.timezone)!,
      value: entry.followersCount,
    }));
  }

  async exportCsv(accountId: string, timeframe: string, user: UserEntity, res: Response): Promise<void> {
    const chartData = await this.getChartData(accountId, timeframe, user);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=followers-${accountId}-${timeframe}.csv`);

    const stringifier = stringify({ header: true, delimiter: ';' });
    stringifier.pipe(res);

    stringifier.on('error', (err) => {
      this.logger.error('Error during CSV stringification', err);
      if (!res.headersSent) {
        res.status(500).send('Error generating CSV');
      }
    });

    chartData.forEach((row) => {
      stringifier.write({ Date: row.time, Followers: row.value });
    });
    stringifier.end();
  }
}
