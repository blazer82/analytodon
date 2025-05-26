import { AccountEntity, DailyAccountStatsEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { EntityManager, EntityRepository, Loaded } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'bson';
import { stringify } from 'csv-stringify';
import { Response } from 'express';

import { AccountsService } from '../accounts/accounts.service';
import * as timeframeHelper from '../shared/utils/timeframe.helper';
import { FollowersService } from './followers.service';

// Mocks for external modules and helpers
jest.mock('csv-stringify');
jest.mock('../shared/utils/timeframe.helper');

describe('FollowersService', () => {
  let service: FollowersService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockDailyAccountStatsRepository: jest.Mocked<EntityRepository<DailyAccountStatsEntity>>;
  let mockAccountsService: jest.Mocked<AccountsService>;

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

    mockDailyAccountStatsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<EntityRepository<DailyAccountStatsEntity>>;

    mockAccountsService = {
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
    } as unknown as jest.Mocked<AccountsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowersService,
        { provide: EntityManager, useValue: mockEm },
        { provide: getRepositoryToken(DailyAccountStatsEntity), useValue: mockDailyAccountStatsRepository },
        { provide: AccountsService, useValue: mockAccountsService },
      ],
    })
      .setLogger(new Logger())
      .compile();
    module.useLogger(false); // Disable logger for tests

    service = module.get<FollowersService>(FollowersService);

    mockedResolveTimeframe.mockReturnValue({
      dateFrom: new Date('2023-01-01T00:00:00.000Z'),
      dateTo: new Date('2023-01-31T00:00:00.000Z'),
      timeframe: 'last30days',
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
            mockDailyAccountStatsRepository,
            mockAccount.id,
            mockAccount.timezone,
            expect.any(Function), // getDaysToWeek/Month/YearBeginning
            'followersCount',
          );
          expect(mockedGetKPITrend).toHaveBeenCalledWith({ currentPeriod: 10, previousPeriod: 5 });
          expect(result).toEqual({ currentPeriod: 10, previousPeriod: 5, trend: 1 });
        });
      });
    });
  });

  describe('getTotalSnapshot', () => {
    it('should return total snapshot if data exists', async () => {
      const mockStatEntry = { followersCount: 100, day: new Date() } as DailyAccountStatsEntity;
      mockDailyAccountStatsRepository.findOne.mockResolvedValue(mockStatEntry);

      const result = await service.getTotalSnapshot(mockAccount);

      expect(mockDailyAccountStatsRepository.findOne).toHaveBeenCalledWith(
        { account: mockAccount.id },
        { orderBy: { day: 'DESC' } },
      );
      expect(result).toEqual({ amount: mockStatEntry.followersCount, day: mockStatEntry.day });
    });

    it('should return null if no data exists', async () => {
      mockDailyAccountStatsRepository.findOne.mockResolvedValue(null);

      const result = await service.getTotalSnapshot(mockAccount);
      expect(result).toBeNull();
    });
  });

  describe('getChartData', () => {
    it('should return chart data correctly', async () => {
      const dateFrom = new Date('2023-01-10T00:00:00.000Z');
      const dateTo = new Date('2023-01-12T00:00:00.000Z');
      mockedResolveTimeframe.mockReturnValue({ dateFrom, dateTo, timeframe: 'custom' });

      // Mock stats should only include data within the dateFrom and dateTo range
      const mockStats = [
        { day: new Date('2023-01-10T00:00:00.000Z'), followersCount: 15 },
        { day: new Date('2023-01-11T00:00:00.000Z'), followersCount: 20 },
        { day: new Date('2023-01-12T00:00:00.000Z'), followersCount: 22 },
      ] as DailyAccountStatsEntity[];
      mockDailyAccountStatsRepository.find.mockResolvedValue(mockStats);

      const result = await service.getChartData(mockAccount, 'last30days');

      expect(mockDailyAccountStatsRepository.find).toHaveBeenCalledWith(
        { account: mockAccount.id, day: { $gte: dateFrom, $lte: dateTo } }, // No oneDayEarlier
        { orderBy: { day: 'ASC' } },
      );
      expect(result).toEqual([
        { time: '2023-01-10', value: 15 },
        { time: '2023-01-11', value: 20 },
        { time: '2023-01-12', value: 22 },
      ]);
    });

    it('should return empty array if no stats found', async () => {
      mockDailyAccountStatsRepository.find.mockResolvedValue([]);
      const result = await service.getChartData(mockAccount, 'last7days');
      expect(result).toEqual([]);
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
        `attachment; filename=followers-${mockAccount.id}-last7days.csv`,
      );
      expect(stringify).toHaveBeenCalledWith({ header: true, delimiter: ';' });
      expect(mockStringifier.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-01', Followers: 10 });
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-02', Followers: 15 });
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
