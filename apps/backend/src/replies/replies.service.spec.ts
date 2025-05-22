import { EntityManager, EntityRepository, Loaded, Rel } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { AccountsService } from '../accounts/accounts.service';
import { AccountEntity } from '../accounts/entities/account.entity';
import { UserRole } from '../shared/enums/user-role.enum';
import * as timeframeHelper from '../shared/utils/timeframe.helper';
import { TootRankingEnum } from '../toots/dto/get-top-toots-query.dto';
import { DailyTootStatsEntity } from '../toots/entities/daily-toot-stats.entity';
import { TootEntity } from '../toots/entities/toot.entity';
import { TootsService } from '../toots/toots.service';
import { UserEntity } from '../users/entities/user.entity';
import { RepliesService } from './replies.service';

// Mocks for external modules and helpers
jest.mock('csv-stringify');
jest.mock('../shared/utils/timeframe.helper');

describe('RepliesService', () => {
  let service: RepliesService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockDailyTootStatsRepository: jest.Mocked<EntityRepository<DailyTootStatsEntity>>;
  let mockAccountsService: jest.Mocked<AccountsService>;
  let mockTootsService: jest.Mocked<TootsService>;

  const mockUser = {
    id: new ObjectId().toHexString(),
    email: 'test@example.com',
    role: UserRole.AccountOwner,
  } as UserEntity;

  const mockAccountId = new ObjectId().toHexString();
  const mockAccount = {
    id: mockAccountId,
    owner: mockUser,
    timezone: 'Europe/Berlin',
    setupComplete: true,
  } as Loaded<AccountEntity>;

  // Spies for helper functions
  const mockedGetPeriodKPI = timeframeHelper.getPeriodKPI as jest.Mock;
  const mockedGetKPITrend = timeframeHelper.getKPITrend as jest.Mock;
  const mockedResolveTimeframe = timeframeHelper.resolveTimeframe as jest.Mock;
  const mockedFormatDateISO = timeframeHelper.formatDateISO as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockEm = {} as unknown as jest.Mocked<EntityManager>;

    mockDailyTootStatsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<EntityRepository<DailyTootStatsEntity>>;

    mockAccountsService = {
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;

    mockTootsService = {
      getTopToots: jest.fn(),
    } as unknown as jest.Mocked<TootsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepliesService,
        { provide: EntityManager, useValue: mockEm },
        { provide: getRepositoryToken(DailyTootStatsEntity), useValue: mockDailyTootStatsRepository },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: TootsService, useValue: mockTootsService },
      ],
    })
      .setLogger(new Logger())
      .compile();
    module.useLogger(false); // Disable logger for tests

    service = module.get<RepliesService>(RepliesService);

    mockedResolveTimeframe.mockReturnValue({
      dateFrom: new Date('2023-01-01T00:00:00.000Z'),
      dateTo: new Date('2023-01-31T00:00:00.000Z'),
      timeframe: 'last30days', // ensure timeframe is part of the mock
    });
    mockedFormatDateISO.mockImplementation((date) => (date ? date.toISOString().split('T')[0] : null));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('KPI methods (getWeeklyKpi, getMonthlyKpi, getYearlyKpi)', () => {
    const kpiMethods: Array<'getWeeklyKpi' | 'getMonthlyKpi' | 'getYearlyKpi'> = [
      'getWeeklyKpi',
      'getMonthlyKpi',
      'getYearlyKpi',
    ];

    kpiMethods.forEach((methodName) => {
      describe(methodName, () => {
        it('should return KPI data successfully', async () => {
          mockedGetPeriodKPI.mockResolvedValue({ currentPeriod: 10, previousPeriod: 5 });
          mockedGetKPITrend.mockReturnValue(1);

          const result = await service[methodName](mockAccount);

          expect(mockedGetPeriodKPI).toHaveBeenCalledWith(
            mockDailyTootStatsRepository,
            mockAccount.id,
            mockAccount.timezone,
            expect.any(Function), // getDaysToWeek/Month/YearBeginning
            'repliesCount',
          );
          expect(mockedGetKPITrend).toHaveBeenCalledWith({ currentPeriod: 10, previousPeriod: 5 });
          expect(result).toEqual({ currentPeriod: 10, previousPeriod: 5, trend: 1 });
        });
      });
    });
  });

  describe('getTotalSnapshot', () => {
    it('should return total snapshot if data exists', async () => {
      const mockStatEntry = { repliesCount: 100, day: new Date() } as DailyTootStatsEntity;
      mockDailyTootStatsRepository.findOne.mockResolvedValue(mockStatEntry);

      const result = await service.getTotalSnapshot(mockAccount);

      expect(mockDailyTootStatsRepository.findOne).toHaveBeenCalledWith(
        { account: mockAccount.id },
        { orderBy: { day: 'DESC' } },
      );
      expect(result).toEqual({ amount: mockStatEntry.repliesCount, day: mockStatEntry.day });
    });

    it('should return null if no data exists', async () => {
      mockDailyTootStatsRepository.findOne.mockResolvedValue(null);

      const result = await service.getTotalSnapshot(mockAccount);
      expect(result).toBeNull();
    });
  });

  describe('getChartData', () => {
    it('should return chart data correctly', async () => {
      const dateFrom = new Date('2023-01-10T00:00:00.000Z');
      const dateTo = new Date('2023-01-12T00:00:00.000Z');
      mockedResolveTimeframe.mockReturnValue({ dateFrom, dateTo, timeframe: 'custom' });

      const mockStats = [
        { day: new Date('2023-01-09T00:00:00.000Z'), repliesCount: 5 },
        { day: new Date('2023-01-10T00:00:00.000Z'), repliesCount: 15 },
        { day: new Date('2023-01-11T00:00:00.000Z'), repliesCount: 20 },
        { day: new Date('2023-01-12T00:00:00.000Z'), repliesCount: 20 },
      ] as DailyTootStatsEntity[];
      mockDailyTootStatsRepository.find.mockResolvedValue(mockStats);

      const result = await service.getChartData(mockAccount, 'last30days');

      const oneDayEarlier = new Date(dateFrom);
      oneDayEarlier.setUTCDate(oneDayEarlier.getUTCDate() - 1);

      expect(mockDailyTootStatsRepository.find).toHaveBeenCalledWith(
        { account: mockAccount.id, day: { $gte: oneDayEarlier, $lte: dateTo } },
        { orderBy: { day: 'ASC' } },
      );
      expect(result).toEqual([
        { time: '2023-01-10', value: 10 }, // 15 - 5
        { time: '2023-01-11', value: 5 }, // 20 - 15
        { time: '2023-01-12', value: 0 }, // 20 - 20
      ]);
    });

    it('should return empty array if no stats found', async () => {
      mockDailyTootStatsRepository.find.mockResolvedValue([]);
      const result = await service.getChartData(mockAccount, 'last7days');
      expect(result).toEqual([]);
    });
  });

  describe('getTopTootsByReplies', () => {
    it('should return top toots as RankedTootEntity', async () => {
      const mockRankedTootEntities: (TootEntity & { rank: number })[] = [
        {
          _id: new ObjectId(),
          uri: 'uri1',
          account: new ObjectId(mockAccount.id) as unknown as Rel<AccountEntity>, // Simplified for test
          content: 'Toot 1',
          favouritesCount: 5,
          fetchedAt: new Date(),
          language: 'en',
          reblogsCount: 10,
          repliesCount: 50,
          url: 'http://example.com/toot1',
          visibility: 'public',
          createdAt: new Date(),
          rank: 50, // Example rank based on replies
        },
      ];
      mockTootsService.getTopToots.mockResolvedValue(mockRankedTootEntities);

      const result = await service.getTopTootsByReplies(mockAccount, 'last7days');

      expect(mockTootsService.getTopToots).toHaveBeenCalledWith({
        accountId: mockAccount.id,
        ranking: TootRankingEnum.REPLIES,
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
        limit: 10,
      });
      // The service method now returns RankedTootEntity directly
      expect(result).toEqual(mockRankedTootEntities);
    });
  });

  describe('exportCsv', () => {
    let mockRes: jest.Mocked<Response>;
    let mockStringifier: { pipe: jest.Mock; on: jest.Mock; write: jest.Mock; end: jest.Mock };

    beforeEach(() => {
      mockStringifier = {
        pipe: jest.fn(),
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
      (stringify as jest.Mock).mockReturnValue(mockStringifier);

      mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        pipe: jest.fn(),
      } as unknown as jest.Mocked<Response>;
    });

    it('should export chart data to CSV', async () => {
      const chartData = [
        { time: '2023-01-01', value: 10 },
        { time: '2023-01-02', value: 15 },
      ];
      jest.spyOn(service, 'getChartData').mockResolvedValue(chartData);

      await service.exportCsv(mockAccount, 'last7days', mockRes);

      expect(service.getChartData).toHaveBeenCalledWith(mockAccount, 'last7days');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=replies-${mockAccount.id}-last7days.csv`,
      );
      expect(stringify).toHaveBeenCalledWith({ header: true, delimiter: ';' });
      expect(mockStringifier.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-01', Replies: 10 });
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-02', Replies: 15 });
      expect(mockStringifier.end).toHaveBeenCalled();
    });

    it('should handle error during CSV stringification and respond if headers not sent', async () => {
      jest.spyOn(service, 'getChartData').mockResolvedValue([]);
      const testError = new Error('CSV error');
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(testError);
        }
      });
      mockRes.headersSent = false;

      await service.exportCsv(mockAccount, 'last7days', mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error generating CSV');
    });

    it('should handle error during CSV stringification and not respond if headers already sent', async () => {
      jest.spyOn(service, 'getChartData').mockResolvedValue([]);
      const testError = new Error('CSV error');
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(testError);
        }
      });
      mockRes.headersSent = true;

      await service.exportCsv(mockAccount, 'last7days', mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });
});
