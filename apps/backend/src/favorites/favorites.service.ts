import { AccountEntity, DailyTootStatsEntity } from '@analytodon/shared-orm';
import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { AccountsService } from '../accounts/accounts.service';
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
import { RankedTootEntity, TootsService } from '../toots/toots.service';

// FavoritedTootDto is now a concern of the controller
// DTOs for KPI, Chart, Total will be handled by the controller

// Define internal data structures or use plain objects directly
export interface InternalKpiData {
  currentPeriod?: number;
  previousPeriod?: number;
  currentPeriodProgress?: number;
  isLastPeriod?: boolean;
  trend?: number | null;
}

export interface InternalTotalSnapshotData {
  amount: number;
  day: Date;
}

export interface InternalChartDataPoint {
  time: string;
  value: number | null;
}

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
   * Retrieves weekly Key Performance Indicators (KPIs) for favorites for a specific account.
   * @param account - The loaded account entity.
   * @returns A promise that resolves to internal KPI data.
   */
  async getWeeklyKpi(account: Loaded<AccountEntity>): Promise<InternalKpiData> {
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
   * @param account - The loaded account entity.
   * @returns A promise that resolves to internal KPI data.
   */
  async getMonthlyKpi(account: Loaded<AccountEntity>): Promise<InternalKpiData> {
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
   * @param account - The loaded account entity.
   * @returns A promise that resolves to internal KPI data.
   */
  async getYearlyKpi(account: Loaded<AccountEntity>): Promise<InternalKpiData> {
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
   * @param account - The loaded account entity.
   * @returns A promise that resolves to internal total snapshot data, or null if no data exists.
   */
  async getTotalSnapshot(account: Loaded<AccountEntity>): Promise<InternalTotalSnapshotData | null> {
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
   * @param account - The loaded account entity.
   * @param timeframe - The timeframe for the chart data (e.g., 'last7days', 'last30days').
   * @returns A promise that resolves to an array of internal chart data points.
   */
  async getChartData(account: Loaded<AccountEntity>, timeframe: string): Promise<InternalChartDataPoint[]> {
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
      .filter((item): item is InternalChartDataPoint => item.value !== null);
  }

  /**
   * Retrieves the top toots ranked by favorites for a specific account within a given timeframe.
   * @param account - The loaded account entity.
   * @param timeframe - The timeframe for ranking (e.g., 'last7days', 'last30days').
   * @returns A promise that resolves to an array of TootEntity augmented with rank.
   */
  async getTopTootsByFavorites(account: Loaded<AccountEntity>, timeframe: string): Promise<RankedTootEntity[]> {
    const { dateFrom, dateTo } = resolveTimeframe(account.timezone, timeframe);
    const toots = await this.tootsService.getTopToots({
      accountId: account.id,
      ranking: TootRankingEnum.FAVOURITES,
      dateFrom,
      dateTo,
      limit: 10, // Default limit from legacy
    });
    return toots; // Return the entities directly
  }

  /**
   * Exports favorites data as a CSV file for a specific account and timeframe.
   * @param account - The loaded account entity.
   * @param timeframe - The timeframe for the data to export.
   * @param res - The Express response object to stream the CSV to.
   * @returns A promise that resolves when the CSV has been streamed.
   */
  async exportCsv(account: Loaded<AccountEntity>, timeframe: string, res: Response): Promise<void> {
    const chartData = await this.getChartData(account, timeframe);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=favorites-${account.id}-${timeframe}.csv`);

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
