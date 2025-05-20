import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
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
   * Retrieves weekly Key Performance Indicators (KPIs) for followers for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the followers KPI DTO.
   */
  async getWeeklyKpi(accountId: string, user: UserEntity): Promise<FollowersKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyAccountStatsRepository,
      account.id,
      account.timezone,
      getDaysToWeekBeginning,
      'followersCount',
    );
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves monthly Key Performance Indicators (KPIs) for followers for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the followers KPI DTO.
   */
  async getMonthlyKpi(accountId: string, user: UserEntity): Promise<FollowersKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyAccountStatsRepository,
      account.id,
      account.timezone,
      getDaysToMonthBeginning,
      'followersCount',
    );
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves yearly Key Performance Indicators (KPIs) for followers for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the followers KPI DTO.
   */
  async getYearlyKpi(accountId: string, user: UserEntity): Promise<FollowersKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyAccountStatsRepository,
      account.id,
      account.timezone,
      getDaysToYearBeginning,
      'followersCount',
    );
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves the total snapshot of followers for a specific account.
   * This typically represents the cumulative total and the date of the last data point.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the snapshot.
   * @returns A promise that resolves to the total snapshot DTO, or null if no data exists.
   */
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

  /**
   * Retrieves chart data for followers over a specified timeframe for a specific account.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for the chart data (e.g., 'last7days', 'last30days').
   * @param user - The user requesting the chart data.
   * @returns A promise that resolves to an array of chart data points.
   */
  async getChartData(accountId: string, timeframe: string, user: UserEntity): Promise<ChartDataPointDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);

    // Fetch data directly for the specified timeframe
    const data = await this.dailyAccountStatsRepository.find(
      { account: account.id, day: { $gte: dateFrom, $lte: dateTo } },
      { orderBy: { day: 'ASC' } },
    );

    return data
      .map((entry) => ({
        time: formatDateISO(entry.day, account.timezone)!,
        value: entry.followersCount, // Use absolute followersCount for cumulative chart
      }))
      .filter((item): item is ChartDataPointDto => item.value !== null); // Keep filter for robustness
  }

  /**
   * Exports followers data as a CSV file for a specific account and timeframe.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for the data to export.
   * @param user - The user requesting the export.
   * @param res - The Express response object to stream the CSV to.
   * @returns A promise that resolves when the CSV has been streamed.
   */
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
