import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
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
import { FavoritedTootDto } from './dto/favorited-toot.dto';
import { FavoritesKpiDto } from './dto/favorites-kpi.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

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
   * Retrieves weekly Key Performance Indicators (KPIs) for favorites for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the favorites KPI DTO.
   */
  async getWeeklyKpi(accountId: string, user: UserEntity): Promise<FavoritesKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToWeekBeginning,
      'favouritesCount',
    );
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves monthly Key Performance Indicators (KPIs) for favorites for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the favorites KPI DTO.
   */
  async getMonthlyKpi(accountId: string, user: UserEntity): Promise<FavoritesKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToMonthBeginning,
      'favouritesCount',
    );
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves yearly Key Performance Indicators (KPIs) for favorites for a specific account.
   * @param accountId - The ID of the account.
   * @param user - The user requesting the KPIs.
   * @returns A promise that resolves to the favorites KPI DTO.
   */
  async getYearlyKpi(accountId: string, user: UserEntity): Promise<FavoritesKpiDto> {
    const account = await this.getAccountOrFail(accountId, user);
    const kpiData = await getPeriodKPI(
      this.dailyTootStatsRepository,
      account.id,
      account.timezone,
      getDaysToYearBeginning,
      'favouritesCount',
    );
    const trend = getKPITrend(kpiData);
    return {
      ...kpiData,
      trend: trend !== null ? trend : undefined, // Convert null to undefined to omit from response
    };
  }

  /**
   * Retrieves the total snapshot of favorites for a specific account.
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
        amount: entry.favouritesCount,
        day: entry.day,
      };
    }
    return null;
  }

  /**
   * Retrieves chart data for favorites over a specified timeframe for a specific account.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for the chart data (e.g., 'last7days', 'last30days').
   * @param user - The user requesting the chart data.
   * @returns A promise that resolves to an array of chart data points.
   */
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
        value: index > 0 ? Math.max(0, entry.favouritesCount - list[index - 1].favouritesCount) : null,
      }))
      .filter((item): item is ChartDataPointDto => item.value !== null);
  }

  /**
   * Retrieves the top toots ranked by favorites for a specific account within a given timeframe.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for ranking (e.g., 'last7days', 'last30days').
   * @param user - The user requesting the top toots.
   * @returns A promise that resolves to an array of favorited toot DTOs.
   */
  async getTopTootsByFavorites(accountId: string, timeframe: string, user: UserEntity): Promise<FavoritedTootDto[]> {
    const account = await this.getAccountOrFail(accountId, user);
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);
    const toots = await this.tootsService.getTopToots({
      accountId: account.id,
      ranking: TootRankingEnum.FAVOURITES,
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
    })) as FavoritedTootDto[];
  }

  /**
   * Exports favorites data as a CSV file for a specific account and timeframe.
   * @param accountId - The ID of the account.
   * @param timeframe - The timeframe for the data to export.
   * @param user - The user requesting the export.
   * @param res - The Express response object to stream the CSV to.
   * @returns A promise that resolves when the CSV has been streamed.
   */
  async exportCsv(accountId: string, timeframe: string, user: UserEntity, res: Response): Promise<void> {
    const chartData = await this.getChartData(accountId, timeframe, user);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=favorites-${accountId}-${timeframe}.csv`);

    const stringifier = stringify({ header: true, delimiter: ';' });
    stringifier.pipe(res);

    stringifier.on('error', (err) => {
      this.logger.error('Error during CSV stringification', err);
      if (!res.headersSent) {
        res.status(500).send('Error generating CSV');
      }
    });

    chartData.forEach((row) => {
      stringifier.write({ Date: row.time, Favorites: row.value });
    });
    stringifier.end();
  }
}
