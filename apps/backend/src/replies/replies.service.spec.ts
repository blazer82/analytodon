import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger, NotFoundException } from '@nestjs/common';
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

  describe('getAccountOrFail (private method tested via public methods)', () => {
    it('should throw NotFoundException if account not found', async () => {
      mockAccountsService.findByIdOrFail.mockRejectedValue(new NotFoundException(`Account not found`));
      await expect(service.getWeeklyKpi(mockAccountId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if account setup not complete', async () => {
      mockAccountsService.findByIdOrFail.mockRejectedValue(new NotFoundException(`Account setup is not complete`));
      await expect(service.getWeeklyKpi(mockAccountId, mockUser)).rejects.toThrow(NotFoundException);
    });
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
          mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
          mockedGetPeriodKPI.mockResolvedValue({ currentPeriod: 10, previousPeriod: 5 });
          mockedGetKPITrend.mockReturnValue(1);

          const result = await service[methodName](mockAccountId, mockUser);

          expect(mockAccountsService.findByIdOrFail).toHaveBeenCalledWith(mockAccountId, mockUser, true);
          expect(mockedGetPeriodKPI).toHaveBeenCalledWith(
            mockDailyTootStatsRepository,
            mockAccountId,
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
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      const mockStatEntry = { repliesCount: 100, day: new Date() } as DailyTootStatsEntity;
      mockDailyTootStatsRepository.findOne.mockResolvedValue(mockStatEntry);

      const result = await service.getTotalSnapshot(mockAccountId, mockUser);

      expect(mockDailyTootStatsRepository.findOne).toHaveBeenCalledWith(
        { account: mockAccountId },
        { orderBy: { day: 'DESC' } },
      );
      expect(result).toEqual({ amount: mockStatEntry.repliesCount, day: mockStatEntry.day });
    });

    it('should return null if no data exists', async () => {
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      mockDailyTootStatsRepository.findOne.mockResolvedValue(null);

      const result = await service.getTotalSnapshot(mockAccountId, mockUser);
      expect(result).toBeNull();
    });
  });

  describe('getChartData', () => {
    it('should return chart data correctly', async () => {
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
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

      const result = await service.getChartData(mockAccountId, 'last30days', mockUser);

      const oneDayEarlier = new Date(dateFrom);
      oneDayEarlier.setUTCDate(oneDayEarlier.getUTCDate() - 1);

      expect(mockDailyTootStatsRepository.find).toHaveBeenCalledWith(
        { account: mockAccountId, day: { $gte: oneDayEarlier, $lte: dateTo } },
        { orderBy: { day: 'ASC' } },
      );
      expect(result).toEqual([
        { time: '2023-01-10', value: 10 }, // 15 - 5
        { time: '2023-01-11', value: 5 }, // 20 - 15
        { time: '2023-01-12', value: 0 }, // 20 - 20
      ]);
    });

    it('should return empty array if no stats found', async () => {
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      mockDailyTootStatsRepository.find.mockResolvedValue([]);
      const result = await service.getChartData(mockAccountId, 'last7days', mockUser);
      expect(result).toEqual([]);
    });
  });

  describe('getTopTootsByReplies', () => {
    it('should return top toots mapped to RepliedTootDto', async () => {
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      const mockRawToots = [
        {
          id: 'toot1', // TootsService.getTopToots returns RankedTootDto which has id as string
          content: 'Toot 1',
          url: 'url1',
          reblogsCount: 10,
          repliesCount: 50,
          favouritesCount: 5,
          createdAt: new Date(),
          rank: 50,
        },
      ];
      mockTootsService.getTopToots.mockResolvedValue(mockRawToots);

      const result = await service.getTopTootsByReplies(mockAccountId, 'last7days', mockUser);

      expect(mockTootsService.getTopToots).toHaveBeenCalledWith({
        accountId: mockAccountId,
        ranking: TootRankingEnum.REPLIES,
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
        limit: 10,
      });
      expect(result).toEqual([
        {
          id: 'toot1',
          content: 'Toot 1',
          url: 'url1',
          reblogsCount: 10,
          repliesCount: 50,
          favouritesCount: 5,
          createdAt: mockRawToots[0].createdAt,
          rank: 50,
        },
      ]);
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
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      const chartData = [
        { time: '2023-01-01', value: 10 },
        { time: '2023-01-02', value: 15 },
      ];
      jest.spyOn(service, 'getChartData').mockResolvedValue(chartData);

      await service.exportCsv(mockAccountId, 'last7days', mockUser, mockRes);

      expect(service.getChartData).toHaveBeenCalledWith(mockAccountId, 'last7days', mockUser);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=replies-${mockAccountId}-last7days.csv`,
      );
      expect(stringify).toHaveBeenCalledWith({ header: true, delimiter: ';' });
      expect(mockStringifier.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-01', Replies: 10 });
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-02', Replies: 15 });
      expect(mockStringifier.end).toHaveBeenCalled();
    });

    it('should handle error during CSV stringification and respond if headers not sent', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      jest.spyOn(service, 'getChartData').mockResolvedValue([]);
      const testError = new Error('CSV error');
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(testError);
        }
      });
      mockRes.headersSent = false;

      await service.exportCsv(mockAccountId, 'last7days', mockUser, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error generating CSV');
    });

    it('should handle error during CSV stringification and not respond if headers already sent', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      jest.spyOn(service, 'getChartData').mockResolvedValue([]);
      const testError = new Error('CSV error');
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(testError);
        }
      });
      mockRes.headersSent = true;

      await service.exportCsv(mockAccountId, 'last7days', mockUser, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });
});
