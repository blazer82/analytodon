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
import { TootEntity } from '../toots/entities/toot.entity';
import { TootsService } from '../toots/toots.service';
import { UserEntity } from '../users/entities/user.entity';
import { BoostsService } from './boosts.service';

// Mocks for external modules and helpers
jest.mock('csv-stringify');
jest.mock('../shared/utils/timeframe.helper');

describe('BoostsService', () => {
  let service: BoostsService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockDailyTootStatsRepository: jest.Mocked<EntityRepository<DailyTootStatsEntity>>;
  // TootEntity repository is not directly used by BoostsService methods, but TootsService is.
  // let mockTootRepository: jest.Mocked<EntityRepository<TootEntity>>;
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
    jest.clearAllMocks(); // Clear all mocks

    // Mock EntityManager
    mockEm = {
      // Add any methods of EntityManager used by the service if necessary
    } as unknown as jest.Mocked<EntityManager>;

    // Mock Repositories
    mockDailyTootStatsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<EntityRepository<DailyTootStatsEntity>>;

    // Mock Services
    mockAccountsService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;

    mockTootsService = {
      getTopToots: jest.fn(),
    } as unknown as jest.Mocked<TootsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoostsService,
        { provide: EntityManager, useValue: mockEm },
        { provide: getRepositoryToken(DailyTootStatsEntity), useValue: mockDailyTootStatsRepository },
        // { provide: getRepositoryToken(TootEntity), useValue: mockTootRepository }, // If needed
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: TootsService, useValue: mockTootsService },
      ],
    })
      .setLogger(new Logger()) // Optional: use a real logger or a mock
      .compile();
    module.useLogger(false); // Disable logger for tests

    service = module.get<BoostsService>(BoostsService);

    // Default mock implementations for helper functions
    mockedResolveTimeframe.mockReturnValue({
      dateFrom: new Date('2023-01-01T00:00:00.000Z'),
      dateTo: new Date('2023-01-31T00:00:00.000Z'),
    });
    mockedFormatDateISO.mockImplementation((date) => (date ? date.toISOString().split('T')[0] : null));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccountOrFail (private method tested via public methods)', () => {
    it('should throw NotFoundException if account not found', async () => {
      mockAccountsService.findById.mockResolvedValue(null);
      await expect(service.getWeeklyKpi(mockAccountId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if account setup not complete', async () => {
      mockAccountsService.findById.mockResolvedValue({ ...mockAccount, setupComplete: false } as Loaded<AccountEntity>);
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
          mockAccountsService.findById.mockResolvedValue(mockAccount);
          mockedGetPeriodKPI.mockResolvedValue({ currentPeriod: 10, previousPeriod: 5 });
          mockedGetKPITrend.mockReturnValue(1); // Example trend

          const result = await service[methodName](mockAccountId, mockUser);

          expect(mockAccountsService.findById).toHaveBeenCalledWith(mockAccountId, mockUser);
          expect(mockedGetPeriodKPI).toHaveBeenCalledWith(
            mockDailyTootStatsRepository,
            mockAccountId,
            mockAccount.timezone,
            expect.any(Function), // getDaysToWeek/Month/YearBeginning
            'boostsCount',
          );
          expect(mockedGetKPITrend).toHaveBeenCalledWith({ currentPeriod: 10, previousPeriod: 5 });
          expect(result).toEqual({ currentPeriod: 10, previousPeriod: 5, trend: 1 });
        });
      });
    });
  });

  describe('getTotalSnapshot', () => {
    it('should return total snapshot if data exists', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      const mockStatEntry = { boostsCount: 100, day: new Date() } as DailyTootStatsEntity;
      mockDailyTootStatsRepository.findOne.mockResolvedValue(mockStatEntry);

      const result = await service.getTotalSnapshot(mockAccountId, mockUser);

      expect(mockDailyTootStatsRepository.findOne).toHaveBeenCalledWith(
        { account: mockAccountId },
        { orderBy: { day: 'DESC' } },
      );
      expect(result).toEqual({ amount: mockStatEntry.boostsCount, day: mockStatEntry.day });
    });

    it('should return null if no data exists', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      mockDailyTootStatsRepository.findOne.mockResolvedValue(null);

      const result = await service.getTotalSnapshot(mockAccountId, mockUser);
      expect(result).toBeNull();
    });
  });

  describe('getChartData', () => {
    it('should return chart data correctly', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      const dateFrom = new Date('2023-01-10T00:00:00.000Z');
      const dateTo = new Date('2023-01-12T00:00:00.000Z');
      mockedResolveTimeframe.mockReturnValue({ dateFrom, dateTo });

      const mockStats = [
        { day: new Date('2023-01-09T00:00:00.000Z'), boostsCount: 5 }, // Day before dateFrom
        { day: new Date('2023-01-10T00:00:00.000Z'), boostsCount: 15 },
        { day: new Date('2023-01-11T00:00:00.000Z'), boostsCount: 20 },
        { day: new Date('2023-01-12T00:00:00.000Z'), boostsCount: 20 }, // No change
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
        // First entry's value is null because index is 0, then filtered out
        { time: '2023-01-10', value: 10 }, // 15 - 5
        { time: '2023-01-11', value: 5 }, // 20 - 15
        { time: '2023-01-12', value: 0 }, // 20 - 20
      ]);
    });

    it('should return empty array if no stats found', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      mockDailyTootStatsRepository.find.mockResolvedValue([]);
      const result = await service.getChartData(mockAccountId, 'last7days', mockUser);
      expect(result).toEqual([]);
    });
  });

  describe('getTopTootsByBoosts', () => {
    it('should return top toots mapped to BoostedTootDto', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      const mockRawToots = [
        {
          _id: new ObjectId(), // Add _id for mapping
          // id: 'toot1', // This will be overridden by the map if _id is used for mapping
          content: 'Toot 1',
          url: 'url1',
          reblogsCount: 10,
          repliesCount: 2,
          favouritesCount: 5,
          createdAt: new Date(),
        },
      ] as unknown as TootEntity[]; // Cast for simplicity, ensure all fields are present
      mockTootsService.getTopToots.mockResolvedValue(
        mockRawToots.map((t) => ({
          id: t._id.toString(), // Ensure _id is mapped to id string
          content: t.content,
          url: t.url,
          reblogsCount: t.reblogsCount,
          repliesCount: t.repliesCount,
          favouritesCount: t.favouritesCount,
          createdAt: t.createdAt,
          rank: t.reblogsCount,
        })),
      );

      const result = await service.getTopTootsByBoosts(mockAccountId, 'last7days', mockUser);

      expect(mockTootsService.getTopToots).toHaveBeenCalledWith({
        accountId: mockAccountId,
        ranking: TootRankingEnum.BOOSTS,
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
        limit: 10,
      });
      expect(result).toEqual([
        {
          id: mockRawToots[0]._id.toString(),
          content: 'Toot 1',
          url: 'url1',
          reblogsCount: 10,
          repliesCount: 2,
          favouritesCount: 5,
          createdAt: mockRawToots[0].createdAt,
          // rank is not part of BoostedTootDto in the service mapping,
          // but the mock for getTopToots includes it, so the result from
          // getTopTootsByBoosts (which maps from RankedTootDto) will also not have it.
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
        pipe: jest.fn(), // For stringifier.pipe(res)
      } as unknown as jest.Mocked<Response>;
    });

    it('should export chart data to CSV', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      const chartData = [
        { time: '2023-01-01', value: 10 },
        { time: '2023-01-02', value: 15 },
      ];
      // Mock getChartData directly on the service instance for this test
      jest.spyOn(service, 'getChartData').mockResolvedValue(chartData);

      await service.exportCsv(mockAccountId, 'last7days', mockUser, mockRes);

      expect(service.getChartData).toHaveBeenCalledWith(mockAccountId, 'last7days', mockUser);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename=boosts-${mockAccountId}-last7days.csv`,
      );
      expect(stringify).toHaveBeenCalledWith({ header: true, delimiter: ';' });
      expect(mockStringifier.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-01', Boosts: 10 });
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-02', Boosts: 15 });
      expect(mockStringifier.end).toHaveBeenCalled();
    });

    it('should handle error during CSV stringification', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      jest.spyOn(service, 'getChartData').mockResolvedValue([]); // No data, but still tests error handling

      const testError = new Error('CSV error');
      // Simulate error event
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(testError);
        }
      });
      mockRes.headersSent = false; // Simulate headers not sent yet

      // We don't expect exportCsv to throw, but to handle the error (e.g., log, send 500)
      await service.exportCsv(mockAccountId, 'last7days', mockUser, mockRes);

      // Check that logger was called (assuming logger is spied on or service method logs)
      // For now, check that res.status().send() was called
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error generating CSV');
    });

    it('should not send error response if headers already sent', async () => {
      mockAccountsService.findById.mockResolvedValue(mockAccount);
      jest.spyOn(service, 'getChartData').mockResolvedValue([]);
      const testError = new Error('CSV error');
      mockStringifier.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(testError);
        }
      });
      mockRes.headersSent = true; // Simulate headers already sent

      await service.exportCsv(mockAccountId, 'last7days', mockUser, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });
});
