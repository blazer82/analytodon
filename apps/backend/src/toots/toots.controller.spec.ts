import { AccountEntity, UserEntity, UserRole } from '@analytodon/shared-orm';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CHECK_ACCOUNT_KEY } from '../auth/decorators/check-account.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as timeframeHelper from '../shared/utils/timeframe.helper';
import { PostActivityBucketEnum, PostActivityDto } from './dto/post-activity.dto';
import { PostingTimesResponseDto } from './dto/posting-times-response.dto';
import { TootsController } from './toots.controller';
import { TootsService } from './toots.service';

jest.mock('../shared/utils/timeframe.helper', () => ({
  ...jest.requireActual('../shared/utils/timeframe.helper'),
  resolveTimeframe: jest.fn(),
}));

describe('TootsController', () => {
  let controller: TootsController;
  let tootsService: jest.Mocked<Pick<TootsService, 'getPostActivity' | 'getPostingTimes' | 'getTopToots'>>;

  const account = { id: '60d0fe4f5311236168a109ca', timezone: 'Europe/Berlin' } as AccountEntity;
  const user = { id: '60d0fe4f5311236168a109cb' } as UserEntity;
  const mockedResolveTimeframe = timeframeHelper.resolveTimeframe as jest.Mock;

  beforeEach(async () => {
    tootsService = {
      getPostActivity: jest.fn(),
      getPostingTimes: jest.fn(),
      getTopToots: jest.fn().mockResolvedValue([]),
    };
    mockedResolveTimeframe.mockReset();
    mockedResolveTimeframe.mockReturnValue({
      dateFrom: new Date('2024-01-01T00:00:00.000Z'),
      dateTo: new Date('2024-02-01T00:00:00.000Z'),
      timeframe: 'last30days',
    });

    const allowGuard = { canActivate: () => true };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TootsController],
      providers: [{ provide: TootsService, useValue: tootsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowGuard)
      .overrideGuard(AccountOwnerGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<TootsController>(TootsController);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should protect all toots endpoints with JWT, roles and account ownership guards', () => {
    const guards = Reflect.getMetadata('__guards__', TootsController);
    expect(guards).toEqual([JwtAuthGuard, RolesGuard, AccountOwnerGuard]);
  });

  describe('getPostActivity', () => {
    it('should resolve the timeframe in the account timezone and delegate to the service', async () => {
      const dateFrom = new Date('2026-08-31T22:00:00.000Z');
      const dateTo = new Date('2026-09-30T22:00:00.000Z');
      mockedResolveTimeframe.mockReturnValue({ dateFrom, dateTo, timeframe: 'custom' });
      const activity: PostActivityDto = {
        total: 1,
        previousPeriodTotal: 0,
        inProgress: false,
        trend: null,
        bucket: PostActivityBucketEnum.DAY,
        chart: [],
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        days: 30,
        daysWithoutPosts: 29,
        busiestDay: { date: '2026-09-09', count: 1 },
      };
      tootsService.getPostActivity.mockResolvedValue(activity);

      const result = await controller.getPostActivity(
        account.id,
        account,
        { timeframe: 'custom', dateFrom: '2026-09-01', dateTo: '2026-09-30' },
        user,
      );

      expect(mockedResolveTimeframe).toHaveBeenCalledWith('Europe/Berlin', 'custom', {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
      });
      expect(tootsService.getPostActivity).toHaveBeenCalledWith({
        accountId: account.id,
        timezone: 'Europe/Berlin',
        dateFrom,
        dateTo,
      });
      expect(result).toBe(activity);
    });
  });

  describe('getPostingTimes', () => {
    it('should require the account owner role and a completely set up account', () => {
      const handler = TootsController.prototype.getPostingTimes;
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.AccountOwner]);
      expect(Reflect.getMetadata(CHECK_ACCOUNT_KEY, handler)).toEqual({ requireSetupComplete: true });
    });

    it('should return the posting times computed by the service', async () => {
      const response: PostingTimesResponseDto = {
        data: [{ weekday: 1, hour: 9, posts: 2, engagement: 12 }],
        timezone: 'Europe/Berlin',
        timeframe: 'last30days',
      };
      tootsService.getPostingTimes.mockResolvedValue(response);

      const result = await controller.getPostingTimes(account.id, account, { timeframe: 'last30days' }, user);

      expect(result).toBe(response);
      expect(tootsService.getPostingTimes).toHaveBeenCalledWith(account, 'last30days', undefined, undefined);
    });

    it('should pass custom date ranges to the service', async () => {
      tootsService.getPostingTimes.mockResolvedValue({ data: [], timezone: 'UTC', timeframe: 'custom' });

      await controller.getPostingTimes(
        account.id,
        account,
        { timeframe: 'custom', dateFrom: '2024-01-01', dateTo: '2024-01-31' },
        user,
      );

      expect(tootsService.getPostingTimes).toHaveBeenCalledWith(account, 'custom', '2024-01-01', '2024-01-31');
    });
  });

  describe('getTopTootsSummary', () => {
    it.each([
      ['Europe/Berlin', 'Europe/Berlin'],
      ['America/New York', 'America/New_York'],
      ['europe/berlin', 'Europe/Berlin'],
      ['Not/AZone', 'UTC'],
    ])('resolves the timeframe in the normalized account timezone (%p -> %p)', async (timezone, expected) => {
      await controller.getTopTootsSummary(
        account.id,
        { ...account, timezone } as AccountEntity,
        { timeframe: 'last30days' },
        user,
      );

      expect(mockedResolveTimeframe).toHaveBeenCalledTimes(1);
      expect(mockedResolveTimeframe).toHaveBeenCalledWith(expected, 'last30days', {
        dateFrom: undefined,
        dateTo: undefined,
      });
      expect(tootsService.getTopToots).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: new Date('2024-01-01T00:00:00.000Z'),
          dateTo: new Date('2024-02-01T00:00:00.000Z'),
        }),
      );
    });
  });
});
