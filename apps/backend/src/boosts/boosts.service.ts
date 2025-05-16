import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
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
    private readonly accountsService: AccountsService,
    private readonly tootsService: TootsService,
  ) {}

  /**
   * Retrieves an account by ID for a given user or throws a NotFoundException.
   * Also checks if the account setup is complete.
   * @param accountId - The ID of the account to retrieve.
   * @param user - The user who owns the account.
   * @returns A promise that resolves to the loaded account entity.
   * @throws NotFoundException if the account is not found, not owned by the user, or setup is not complete.
   */
  private async getAccountOrFail(accountId: string, user: UserEntity): Promise<Loaded<AccountEntity>> {
    return this.accountsService.findByIdOrFail(accountId, user, true);
  }

  /**
   * Retrieves weekly Key Performance Indicators (KPIs) for boosts for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the boosts KPI DTO.
   */
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
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves monthly Key Performance Indicators (KPIs) for boosts for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the boosts KPI DTO.
   */
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
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves yearly Key Performance Indicators (KPIs) for boosts for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the boosts KPI DTO.
   */
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
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves the total snapshot of boosts for a specific account.
   * This typically represents the cumulative total and the date of the last data point.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the snapshot.
   * @returns A promise that resolves to the total snapshot DTO, or null if no data exists.
   */
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

  /**
   * Retrieves chart data for boosts over a specified timeframe for a specific account.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for the chart data (e.g., 'last7days', 'last30days').
   * @param user - The user requesting the chart data.
   * @returns A promise that resolves to an array of chart data points.
   */
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

  /**
   * Retrieves the top toots ranked by boosts for a specific account within a given timeframe.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for ranking (e.g., 'last7days', 'last30days').
   * @param user - The user requesting the top toots.
   * @returns A promise that resolves to an array of boosted toot DTOs.
   */
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

  /**
   * Exports boosts data as a CSV file for a specific account and timeframe.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for the data to export.
   * @param user - The user requesting the export.
   * @param res - The Express response object to stream the CSV to.
   * @returns A promise that resolves when the CSV has been streamed.
   */
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
