/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolveEffectiveAccountId: vi.fn(),
  mockFollowersApi: {
    followersControllerGetWeeklyKpi: vi.fn(),
    followersControllerGetMonthlyKpi: vi.fn(),
    followersControllerGetYearlyKpi: vi.fn(),
    followersControllerGetTotalSnapshot: vi.fn(),
    followersControllerGetChartData: vi.fn(),
  },
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('~/utils/session.server', () => ({
  withSessionHandling: vi.fn((fn: Function) => fn),
  requireUser: mocks.mockRequireUser,
}));

vi.mock('~/utils/active-account.server', () => ({
  resolveEffectiveAccountId: mocks.mockResolveEffectiveAccountId,
}));

vi.mock('~/services/api.server', () => ({
  createFollowersApiWithAuth: vi.fn(() => Promise.resolve(mocks.mockFollowersApi)),
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

const { loader } = await import('./_app.followers/route');

function callLoader(request: Request) {
  return (loader as Function)({ request, params: {}, context: {} });
}

describe('followers loader', () => {
  const user = makeSessionUser();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns all KPI data when API calls succeed', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const weeklyKPI = { currentPeriod: 10, trend: 5, isLastPeriod: false };
    const monthlyKPI = { currentPeriod: 40, trend: -2, isLastPeriod: false };
    const yearlyKPI = { currentPeriod: 500, trend: 100, isLastPeriod: true };
    const total = { amount: 2000, day: '2024-01-15' };
    const chartData = [{ day: '2024-01-14', value: 10 }];

    mocks.mockFollowersApi.followersControllerGetWeeklyKpi.mockResolvedValue(weeklyKPI);
    mocks.mockFollowersApi.followersControllerGetMonthlyKpi.mockResolvedValue(monthlyKPI);
    mocks.mockFollowersApi.followersControllerGetYearlyKpi.mockResolvedValue(yearlyKPI);
    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockResolvedValue(total);
    mocks.mockFollowersApi.followersControllerGetChartData.mockResolvedValue(chartData);

    const request = makeRequestWithSession('http://localhost/followers');
    const result = await callLoader(request);

    expect(result).toEqual({
      weeklyKPI,
      monthlyKPI,
      yearlyKPI,
      total,
      chart: chartData,
      initialTimeframe: 'last30days',
      accountId: 'acc-1',
    });
  });

  it('defaults timeframe to last30days when no query param', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');
    mocks.mockFollowersApi.followersControllerGetWeeklyKpi.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetMonthlyKpi.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetYearlyKpi.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetChartData.mockResolvedValue([]);

    const request = makeRequestWithSession('http://localhost/followers');
    const result = await callLoader(request);

    expect(result.initialTimeframe).toBe('last30days');
    expect(mocks.mockFollowersApi.followersControllerGetChartData).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'last30days',
    });
  });

  it('reads custom timeframe from query param', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');
    mocks.mockFollowersApi.followersControllerGetWeeklyKpi.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetMonthlyKpi.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetYearlyKpi.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockResolvedValue(null);
    mocks.mockFollowersApi.followersControllerGetChartData.mockResolvedValue([]);

    const request = makeRequestWithSession('http://localhost/followers?timeframe=last7days');
    const result = await callLoader(request);

    expect(result.initialTimeframe).toBe('last7days');
    expect(mocks.mockFollowersApi.followersControllerGetChartData).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'last7days',
    });
  });

  it('returns null KPIs when no accountId', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue(null);

    const request = makeRequestWithSession('http://localhost/followers');
    const result = await callLoader(request);

    expect(result).toEqual({
      weeklyKPI: null,
      monthlyKPI: null,
      yearlyKPI: null,
      total: null,
      chart: [],
      initialTimeframe: 'last30days',
      accountId: null,
    });
  });

  it('handles individual API failures via .catch()', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const total = { amount: 2000, day: '2024-01-15' };
    mocks.mockFollowersApi.followersControllerGetWeeklyKpi.mockRejectedValue(new Error('fail'));
    mocks.mockFollowersApi.followersControllerGetMonthlyKpi.mockResolvedValue({ currentPeriod: 40 });
    mocks.mockFollowersApi.followersControllerGetYearlyKpi.mockRejectedValue(new Error('fail'));
    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockResolvedValue(total);
    mocks.mockFollowersApi.followersControllerGetChartData.mockRejectedValue(new Error('fail'));

    const request = makeRequestWithSession('http://localhost/followers');
    const result = await callLoader(request);

    expect(result.weeklyKPI).toBeNull();
    expect(result.monthlyKPI).toEqual({ currentPeriod: 40 });
    expect(result.yearlyKPI).toBeNull();
    expect(result.total).toEqual(total);
    expect(result.chart).toEqual([]);
  });

  it('re-throws Response errors', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const { createFollowersApiWithAuth } = await import('~/services/api.server');
    const redirectResponse = new Response(null, { status: 302, headers: { Location: '/login' } });
    vi.mocked(createFollowersApiWithAuth).mockRejectedValueOnce(redirectResponse);

    const request = makeRequestWithSession('http://localhost/followers');
    await expect(callLoader(request)).rejects.toBe(redirectResponse);
  });

  it('returns fallback for non-Response errors', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const { createFollowersApiWithAuth } = await import('~/services/api.server');
    vi.mocked(createFollowersApiWithAuth).mockRejectedValueOnce(new Error('network error'));

    const request = makeRequestWithSession('http://localhost/followers');
    const result = await callLoader(request);

    expect(result).toEqual({
      weeklyKPI: null,
      monthlyKPI: null,
      yearlyKPI: null,
      total: null,
      chart: [],
      initialTimeframe: 'last30days',
      accountId: 'acc-1',
    });
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
