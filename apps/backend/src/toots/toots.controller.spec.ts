import { AccountEntity, UserEntity } from '@analytodon/shared-orm';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AccountOwnerGuard } from '../auth/guards/account-owner.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as timeframeHelper from '../shared/utils/timeframe.helper';
import { PostActivityBucketEnum, PostActivityDto } from './dto/post-activity.dto';
import { TootsController } from './toots.controller';
import { TootsService } from './toots.service';

jest.mock('../shared/utils/timeframe.helper', () => ({
  ...jest.requireActual('../shared/utils/timeframe.helper'),
  resolveTimeframe: jest.fn(),
}));

describe('TootsController', () => {
  let controller: TootsController;
  let tootsService: jest.Mocked<Pick<TootsService, 'getPostActivity'>>;

  const account = { id: 'account-1', timezone: 'Europe/Berlin' } as AccountEntity;
  const user = { id: 'user-1' } as UserEntity;
  const mockedResolveTimeframe = timeframeHelper.resolveTimeframe as jest.Mock;

  beforeEach(async () => {
    tootsService = { getPostActivity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TootsController],
      providers: [{ provide: TootsService, useValue: tootsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccountOwnerGuard)
      .useValue({ canActivate: () => true })
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
        accountId: 'account-1',
        timezone: 'Europe/Berlin',
        dateFrom,
        dateTo,
      });
      expect(result).toBe(activity);
    });
  });
});
