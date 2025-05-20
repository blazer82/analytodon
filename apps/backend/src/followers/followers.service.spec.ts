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
import { UserEntity } from '../users/entities/user.entity';
import { DailyAccountStatsEntity } from './entities/daily-account-stats.entity';
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
            mockDailyAccountStatsRepository,
            mockAccountId,
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
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      const mockStatEntry = { followersCount: 100, day: new Date() } as DailyAccountStatsEntity;
      mockDailyAccountStatsRepository.findOne.mockResolvedValue(mockStatEntry);

      const result = await service.getTotalSnapshot(mockAccountId, mockUser);

      expect(mockDailyAccountStatsRepository.findOne).toHaveBeenCalledWith(
        { account: mockAccountId },
        { orderBy: { day: 'DESC' } },
      );
      expect(result).toEqual({ amount: mockStatEntry.followersCount, day: mockStatEntry.day });
    });

    it('should return null if no data exists', async () => {
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      mockDailyAccountStatsRepository.findOne.mockResolvedValue(null);

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

      // Mock stats should only include data within the dateFrom and dateTo range
      const mockStats = [
        { day: new Date('2023-01-10T00:00:00.000Z'), followersCount: 15 },
        { day: new Date('2023-01-11T00:00:00.000Z'), followersCount: 20 },
        { day: new Date('2023-01-12T00:00:00.000Z'), followersCount: 22 },
      ] as DailyAccountStatsEntity[];
      mockDailyAccountStatsRepository.find.mockResolvedValue(mockStats);

      const result = await service.getChartData(mockAccountId, 'last30days', mockUser);

      expect(mockDailyAccountStatsRepository.find).toHaveBeenCalledWith(
        { account: mockAccountId, day: { $gte: dateFrom, $lte: dateTo } }, // No oneDayEarlier
        { orderBy: { day: 'ASC' } },
      );
      expect(result).toEqual([
        { time: '2023-01-10', value: 15 },
        { time: '2023-01-11', value: 20 },
        { time: '2023-01-12', value: 22 },
      ]);
    });

    it('should return empty array if no stats found', async () => {
      mockAccountsService.findByIdOrFail.mockResolvedValue(mockAccount);
      mockDailyAccountStatsRepository.find.mockResolvedValue([]);
      const result = await service.getChartData(mockAccountId, 'last7days', mockUser);
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
        `attachment; filename=followers-${mockAccountId}-last7days.csv`,
      );
      expect(stringify).toHaveBeenCalledWith({ header: true, delimiter: ';' });
      expect(mockStringifier.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-01', Followers: 10 });
      expect(mockStringifier.write).toHaveBeenCalledWith({ Date: '2023-01-02', Followers: 15 });
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
