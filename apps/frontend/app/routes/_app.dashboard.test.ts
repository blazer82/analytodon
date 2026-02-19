/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolveEffectiveAccountId: vi.fn(),
  mockFollowersApi: {
    followersControllerGetTotalSnapshot: vi.fn(),
    followersControllerGetChartData: vi.fn(),
  },
  mockTootsApi: {
    tootsControllerGetTopTootsSummary: vi.fn(),
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
  createTootsApiWithAuth: vi.fn(() => Promise.resolve(mocks.mockTootsApi)),
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

const { loader } = await import('./_app.dashboard');

const callLoader = (request: Request) => (loader as Function)({ request, params: {}, context: {} });

describe('dashboard loader', () => {
  const user = makeSessionUser();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns transformed data when all API calls succeed', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const totalSnapshot = { amount: 1234, day: '2024-01-15' };
    const chartData = [{ day: '2024-01-14', value: 10 }];
    const rankedToot = {
      id: 'toot-1',
      url: 'https://mastodon.social/@user/1',
      content: '<p>Hello</p>',
      createdAt: '2024-01-14T12:00:00Z',
      repliesCount: 5,
      reblogsCount: 10,
      favouritesCount: 20,
    };

    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockResolvedValue(totalSnapshot);
    mocks.mockFollowersApi.followersControllerGetChartData.mockResolvedValue(chartData);
    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockResolvedValue({
      top: { data: [rankedToot] },
    });

    const request = makeRequestWithSession('http://localhost/dashboard');
    const result = await callLoader(request);

    expect(result).toEqual({
      total: totalSnapshot,
      chart: chartData,
      top: [
        {
          uri: 'toot-1',
          url: 'https://mastodon.social/@user/1',
          content: '<p>Hello</p>',
          createdAt: '2024-01-14T12:00:00Z',
          repliesCount: 5,
          reblogsCount: 10,
          favouritesCount: 20,
        },
      ],
    });
  });

  it('returns empty fallback when no accountId', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue(null);

    const request = makeRequestWithSession('http://localhost/dashboard');
    const result = await callLoader(request);

    expect(result).toEqual({ total: null, chart: [], top: [] });
  });

  it('handles partial API failures via Promise.allSettled', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const totalSnapshot = { amount: 500, day: '2024-01-15' };
    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockResolvedValue(totalSnapshot);
    mocks.mockFollowersApi.followersControllerGetChartData.mockRejectedValue(new Error('chart fail'));
    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockRejectedValue(new Error('toots fail'));

    const request = makeRequestWithSession('http://localhost/dashboard');
    const result = await callLoader(request);

    expect(result).toEqual({
      total: totalSnapshot,
      chart: [],
      top: [],
    });
  });

  it('returns all-null fallback when every API call rejects', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockFollowersApi.followersControllerGetTotalSnapshot.mockRejectedValue(new Error('fail'));
    mocks.mockFollowersApi.followersControllerGetChartData.mockRejectedValue(new Error('fail'));
    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockRejectedValue(new Error('fail'));

    const request = makeRequestWithSession('http://localhost/dashboard');
    const result = await callLoader(request);

    expect(result).toEqual({
      total: null,
      chart: [],
      top: [],
    });
  });

  it('re-throws Response errors from API client creation', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const { createFollowersApiWithAuth } = await import('~/services/api.server');
    const redirectResponse = new Response(null, { status: 302, headers: { Location: '/login' } });
    vi.mocked(createFollowersApiWithAuth).mockRejectedValueOnce(redirectResponse);

    const request = makeRequestWithSession('http://localhost/dashboard');
    await expect(callLoader(request)).rejects.toBe(redirectResponse);
  });

  it('returns fallback for non-Response errors from API client creation', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const { createFollowersApiWithAuth } = await import('~/services/api.server');
    vi.mocked(createFollowersApiWithAuth).mockRejectedValueOnce(new Error('network error'));

    const request = makeRequestWithSession('http://localhost/dashboard');
    const result = await callLoader(request);

    expect(result).toEqual({ total: null, chart: [], top: null });
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
