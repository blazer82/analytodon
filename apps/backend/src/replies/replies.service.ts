import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { AccountsService } from '../accounts/accounts.service';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ChartDataPointDto } from '../boosts/dto/chart-data-point.dto'; // Reusing from boosts
import { TotalSnapshotDto } from '../boosts/dto/total-snapshot.dto'; // Reusing from boosts
import {
  formatDateISO,
  getDaysToMonthBeginning,
  getDaysToWeekBeginning,
  getDaysToYearBeginning,
  getKPITrend,
  getPeriodKPI,
  resolveTimeframe,
} from '../shared/utils/timeframe.helper';
import { TootRankingEnum } from '../toots/dto/get-top-toots-query.dto';
import { DailyTootStatsEntity } from '../toots/entities/daily-toot-stats.entity';
import { TootsService } from '../toots/toots.service';
import { UserEntity } from '../users/entities/user.entity';
import { RepliedTootDto } from './dto/replied-toot.dto';
import { RepliesKpiDto } from './dto/replies-kpi.dto';

@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(DailyTootStatsEntity)
    private readonly dailyTootStatsRepository: EntityRepository<DailyTootStatsEntity>,
    private readonly accountsService: AccountsService,
    private readonly tootsService: TootsService,
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

  async getWeeklyKpi(accountId: string, user: UserEntity): Promise<RepliesKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToWeekBeginning,
      'repliesCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getMonthlyKpi(accountId: string, user: UserEntity): Promise<RepliesKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToMonthBeginning,
      'repliesCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getYearlyKpi(accountId: string, user: UserEntity): Promise<RepliesKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToYearBeginning,
      'repliesCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getTotalSnapshot(accountId: string, user: UserEntity): Promise<TotalSnapshotDto | null> {
    const account = await this.getAccountOrFail(accountId, user);
    const entry = await this.dailyTootStatsRepository.findOne({ account: account.id }, { orderBy: { day: 'DESC' } });
    if (entry) {
      return {
        amount: entry.repliesCount,
        day: entry.day,
      };
    }
    return null;
  }

  async getChartData(accountId: string, timeframe: string, user: UserEntity): Promise<ChartDataPointDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    const oneDayEarlier = new Date(dateFrom);
    oneDayEarlier.setUTCDate(oneDayEarlier.getUTCDate() - 1);

    const data = await this.dailyTootStatsRepository.find(
      { account: account.id, day: { $gte: oneDayEarlier, $lte: dateTo } },
      { orderBy: { day: 'ASC' } },
    );

    return data
      .map((entry, index, list) => ({
        time: formatDateISO(entry.day, account.timezone)!,
        value: index > 0 ? Math.max(0, entry.repliesCount - list[index - 1].repliesCount) : null,
      }))
      .filter((item): item is ChartDataPointDto => item.value !== null);
  }

  async getTopTootsByReplies(accountId: string, timeframe: string, user: UserEntity): Promise<RepliedTootDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);
    const toots = await this.tootsService.getTopToots({
      accountId: account.id,
      ranking: TootRankingEnum.REPLIES,
      dateFrom,
      dateTo,
      limit: 10, // Default limit from legacy
    });
    return toots.map((toot) => ({
      id: toot.id,
      content: toot.content,
      url: toot.url,
      reblogsCount: toot.reblogsCount,
      repliesCount: toot.repliesCount,
      favouritesCount: toot.favouritesCount,
      createdAt: toot.createdAt,
      rank: toot.rank,
    })) as RepliedTootDto[];
  }

  async exportCsv(accountId: string, timeframe: string, user: UserEntity, res: Response): Promise<void> {
    const chartData = await this.getChartData(accountId, timeframe, user);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=replies-${accountId}-${timeframe}.csv`);

    const stringifier = stringify({ header: true, delimiter: ';' });
    stringifier.pipe(res);

    stringifier.on('error', (err) => {
      this.logger.error('Error during CSV stringification', err);
      if (!res.headersSent) {
        res.status(500).send('Error generating CSV');
      }
    });

    chartData.forEach((row) => {
      stringifier.write({ Date: row.time, Replies: row.value });
    });
    stringifier.end();
  }
}
