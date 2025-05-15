import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { AccountsService } from '../accounts/accounts.service';
import { AccountEntity } from '../accounts/entities/account.entity';
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
import { TootEntity } from '../toots/entities/toot.entity';
import { TootsService } from '../toots/toots.service';
import { UserEntity } from '../users/entities/user.entity';
import { BoostedTootDto } from './dto/boosted-toot.dto';
import { BoostsKpiDto } from './dto/boosts-kpi.dto';
import { ChartDataPointDto } from './dto/chart-data-point.dto';
import { TotalSnapshotDto } from './dto/total-snapshot.dto';

@Injectable()
export class BoostsService {
  private readonly logger = new Logger(BoostsService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(DailyTootStatsEntity)
    private readonly dailyTootStatsRepository: EntityRepository<DailyTootStatsEntity>,
    @InjectRepository(TootEntity) // Needed if TootsService doesn't cover all TootEntity queries
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

  async getWeeklyKpi(accountId: string, user: UserEntity): Promise<BoostsKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    // Placeholder for getPeriodKPI logic (from legacy _legacy/analytodon/helpers/getPeriodKPI.ts)
    // using 'getDaysToWeekBeginning'
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToWeekBeginning,
      'boostsCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getMonthlyKpi(accountId: string, user: UserEntity): Promise<BoostsKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    // Placeholder for getPeriodKPI logic using 'getDaysToMonthBeginning'
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToMonthBeginning,
      'boostsCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getYearlyKpi(accountId: string, user: UserEntity): Promise<BoostsKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    // Placeholder for getPeriodKPI logic using 'getDaysToYearBeginning'
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToYearBeginning,
      'boostsCount',
    );
    return { ...kpiData, trend: getKPITrend(kpiData) };
  }

  async getTotalSnapshot(accountId: string, user: UserEntity): Promise<TotalSnapshotDto | null> {
    const account = await this.getAccountOrFail(accountId, user);
    const entry = await this.dailyTootStatsRepository.findOne({ account: account.id }, { orderBy: { day: 'DESC' } });
    if (entry) {
      return {
        amount: entry.boostsCount,
        day: entry.day,
      };
    }
    return null;
  }

  async getChartData(accountId: string, timeframe: string, user: UserEntity): Promise<ChartDataPointDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    // Placeholder for getChartData logic (from legacy _legacy/analytodon/service/boosts/getChartData.ts)
    const oneDayEarlier = new Date(dateFrom);
    oneDayEarlier.setUTCDate(oneDayEarlier.getUTCDate() - 1);

    const data = await this.dailyTootStatsRepository.find(
      { account: account.id, day: { $gte: oneDayEarlier, $lte: dateTo } },
      { orderBy: { day: 'ASC' } },
    );

    return data
      .map((entry, index, list) => ({
        time: formatDateISO(entry.day, account.timezone)!, // Assert non-null as entry.day exists
        value: index > 0 ? Math.max(0, entry.boostsCount - list[index - 1].boostsCount) : null,
      }))
      .filter((item): item is ChartDataPointDto => item.value !== null);
  }

  async getTopTootsByBoosts(accountId: string, timeframe: string, user: UserEntity): Promise<BoostedTootDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);
    // Assuming TootsService.getTopToots exists and works similarly to legacy
    const toots = await this.tootsService.getTopToots({
      accountId: account.id,
      ranking: TootRankingEnum.BOOSTS,
      dateFrom,
      dateTo,
      limit: 10, // Default limit from legacy
    });
    // Map to BoostedTootDto, assuming 'toots' is an array of TootEntity or similar
    return toots.map((toot) => ({
      id: toot.id,
      content: toot.content,
      url: toot.url,
      reblogsCount: toot.reblogsCount,
      repliesCount: toot.repliesCount,
      favouritesCount: toot.favouritesCount,
      createdAt: toot.createdAt,
      // rank: (toot as any).rank, // If rank is dynamically added
    })) as BoostedTootDto[];
  }

  async exportCsv(accountId: string, timeframe: string, user: UserEntity, res: Response): Promise<void> {
    const chartData = await this.getChartData(accountId, timeframe, user); // Re-use getChartData

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=boosts-${accountId}-${timeframe}.csv`);

    const stringifier = stringify({ header: true, delimiter: ';' });
    stringifier.pipe(res);

    stringifier.on('error', (err) => {
      this.logger.error('Error during CSV stringification', err);
      // Ensure response is ended if headers not yet sent
      if (!res.headersSent) {
        res.status(500).send('Error generating CSV');
      }
    });

    chartData.forEach((row) => {
      stringifier.write({ Date: row.time, Boosts: row.value });
    });
    stringifier.end();
  }
}
