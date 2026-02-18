import {
  AccountEntity,
  DailyAccountStatsEntity,
  DailyTootStatsEntity,
  TootEntity,
  UserEntity,
  UserRole,
} from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/mongodb';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<EntityRepository<UserEntity>>;
  let accountRepository: jest.Mocked<EntityRepository<AccountEntity>>;
  let tootRepository: jest.Mocked<EntityRepository<TootEntity>>;
  let dailyAccountStatsRepository: jest.Mocked<EntityRepository<DailyAccountStatsEntity>>;
  let dailyTootStatsRepository: jest.Mocked<EntityRepository<DailyTootStatsEntity>>;

  let mockUsersCollection: { aggregate: jest.Mock };
  let mockAccountsCollection: { aggregate: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUsersCollection = {
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    };

    mockAccountsCollection = {
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    };

    const mockGetCollection = (name: string) => {
      if (name === 'users') return mockUsersCollection;
      if (name === 'accounts') return mockAccountsCollection;
      return { aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
    };

    const mockEntityManager = {
      getDriver: jest.fn().mockReturnValue({
        getConnection: jest.fn().mockReturnValue({
          getCollection: jest.fn().mockImplementation(mockGetCollection),
        }),
      }),
    };

    const createMockRepository = () => ({
      count: jest.fn().mockResolvedValue(0),
      getEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(UserEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(AccountEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(TootEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(DailyAccountStatsEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(DailyTootStatsEntity), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    accountRepository = module.get(getRepositoryToken(AccountEntity));
    tootRepository = module.get(getRepositoryToken(TootEntity));
    dailyAccountStatsRepository = module.get(getRepositoryToken(DailyAccountStatsEntity));
    dailyTootStatsRepository = module.get(getRepositoryToken(DailyTootStatsEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return complete stats structure with all sections', async () => {
      const result = await service.getStats();

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('accounts');
      expect(result).toHaveProperty('dataVolume');
      expect(result.users).toHaveProperty('totalCount');
      expect(result.users).toHaveProperty('activeCount');
      expect(result.users).toHaveProperty('inactiveCount');
      expect(result.users).toHaveProperty('emailVerifiedCount');
      expect(result.users).toHaveProperty('roleBreakdown');
      expect(result.users).toHaveProperty('registrations');
      expect(result.users).toHaveProperty('loginActivity');
      expect(result.accounts).toHaveProperty('totalCount');
      expect(result.accounts).toHaveProperty('setupCompleteCount');
      expect(result.accounts).toHaveProperty('setupIncompleteCount');
      expect(result.accounts).toHaveProperty('activeCount');
      expect(result.accounts).toHaveProperty('inactiveCount');
      expect(result.accounts).toHaveProperty('serverDistribution');
      expect(result.dataVolume).toHaveProperty('totalToots');
      expect(result.dataVolume).toHaveProperty('totalDailyAccountStats');
      expect(result.dataVolume).toHaveProperty('totalDailyTootStats');
    });

    it('should return correct user counts by status and role', async () => {
      // Set up specific return values for each count call
      userRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(85) // activeUsers
        .mockResolvedValueOnce(15) // inactiveUsers
        .mockResolvedValueOnce(90) // emailVerifiedUsers
        .mockResolvedValueOnce(3) // adminUsers
        .mockResolvedValueOnce(97) // accountOwnerUsers
        .mockResolvedValueOnce(20) // loginLast7Days
        .mockResolvedValueOnce(50) // loginLast30Days
        .mockResolvedValueOnce(75); // loginLast90Days

      const result = await service.getStats();

      expect(result.users.totalCount).toBe(100);
      expect(result.users.activeCount).toBe(85);
      expect(result.users.inactiveCount).toBe(15);
      expect(result.users.emailVerifiedCount).toBe(90);
      expect(result.users.roleBreakdown.admin).toBe(3);
      expect(result.users.roleBreakdown.accountOwner).toBe(97);
    });

    it('should query user counts with correct filters', async () => {
      await service.getStats();

      // Verify the filter arguments passed to count()
      expect(userRepository.count).toHaveBeenCalledWith({});
      expect(userRepository.count).toHaveBeenCalledWith({ isActive: true });
      expect(userRepository.count).toHaveBeenCalledWith({ isActive: false });
      expect(userRepository.count).toHaveBeenCalledWith({ emailVerified: true });
      expect(userRepository.count).toHaveBeenCalledWith({ role: UserRole.Admin });
      expect(userRepository.count).toHaveBeenCalledWith({ role: UserRole.AccountOwner });
    });

    it('should return correct login activity counts', async () => {
      userRepository.count
        .mockResolvedValueOnce(0) // totalUsers
        .mockResolvedValueOnce(0) // activeUsers
        .mockResolvedValueOnce(0) // inactiveUsers
        .mockResolvedValueOnce(0) // emailVerifiedUsers
        .mockResolvedValueOnce(0) // adminUsers
        .mockResolvedValueOnce(0) // accountOwnerUsers
        .mockResolvedValueOnce(10) // loginLast7Days
        .mockResolvedValueOnce(25) // loginLast30Days
        .mockResolvedValueOnce(40); // loginLast90Days

      const result = await service.getStats();

      expect(result.users.loginActivity.last7Days).toBe(10);
      expect(result.users.loginActivity.last30Days).toBe(25);
      expect(result.users.loginActivity.last90Days).toBe(40);
    });

    it('should query login activity with date thresholds', async () => {
      const beforeTest = new Date();
      await service.getStats();

      // Find the login activity calls (7th, 8th, 9th calls to count)
      const loginCalls = userRepository.count.mock.calls.filter(
        (call) => call[0] && typeof call[0] === 'object' && 'lastLoginAt' in call[0],
      );

      expect(loginCalls).toHaveLength(3);

      // Verify each call has a $gte date filter
      for (const call of loginCalls) {
        const filter = call[0] as Record<string, Record<string, Date>>;
        expect(filter.lastLoginAt).toHaveProperty('$gte');
        expect(filter.lastLoginAt.$gte).toBeInstanceOf(Date);
        // The date should be before now
        expect(filter.lastLoginAt.$gte.getTime()).toBeLessThanOrEqual(beforeTest.getTime());
      }
    });

    it('should return registration trend from aggregation', async () => {
      const mockAggResult = [
        { _id: '2026-02-01', count: 3 },
        { _id: '2026-02-02', count: 5 },
        { _id: '2026-02-03', count: 2 },
      ];
      mockUsersCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggResult),
      });

      const result = await service.getStats();

      expect(result.users.registrations.last30DaysCount).toBe(10);
      expect(result.users.registrations.dailyBreakdown).toEqual([
        { date: '2026-02-01', count: 3 },
        { date: '2026-02-02', count: 5 },
        { date: '2026-02-03', count: 2 },
      ]);
    });

    it('should return server distribution from aggregation', async () => {
      const mockAggResult = [
        { _id: 'mastodon.social', count: 25 },
        { _id: 'mastodon.online', count: 10 },
      ];
      mockAccountsCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockAggResult),
      });

      const result = await service.getStats();

      expect(result.accounts.serverDistribution).toEqual([
        { serverURL: 'mastodon.social', count: 25 },
        { serverURL: 'mastodon.online', count: 10 },
      ]);
    });

    it('should return correct account counts', async () => {
      accountRepository.count
        .mockResolvedValueOnce(150) // totalAccounts
        .mockResolvedValueOnce(120) // setupCompleteAccounts
        .mockResolvedValueOnce(30) // setupIncompleteAccounts
        .mockResolvedValueOnce(100) // activeAccounts
        .mockResolvedValueOnce(50); // inactiveAccounts

      const result = await service.getStats();

      expect(result.accounts.totalCount).toBe(150);
      expect(result.accounts.setupCompleteCount).toBe(120);
      expect(result.accounts.setupIncompleteCount).toBe(30);
      expect(result.accounts.activeCount).toBe(100);
      expect(result.accounts.inactiveCount).toBe(50);
    });

    it('should return correct data volume counts', async () => {
      tootRepository.count.mockResolvedValueOnce(50000);
      dailyAccountStatsRepository.count.mockResolvedValueOnce(10000);
      dailyTootStatsRepository.count.mockResolvedValueOnce(25000);

      const result = await service.getStats();

      expect(result.dataVolume.totalToots).toBe(50000);
      expect(result.dataVolume.totalDailyAccountStats).toBe(10000);
      expect(result.dataVolume.totalDailyTootStats).toBe(25000);
    });

    it('should handle empty aggregation results', async () => {
      const result = await service.getStats();

      expect(result.users.registrations.last30DaysCount).toBe(0);
      expect(result.users.registrations.dailyBreakdown).toEqual([]);
      expect(result.accounts.serverDistribution).toEqual([]);
    });
  });
});
