/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolveEffectiveAccountId: vi.fn(),
  mockTootsApi: {
    tootsControllerGetTopTootsSummary: vi.fn(),
    tootsControllerGetPostActivity: vi.fn(),
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
  createTootsApiWithAuth: vi.fn(() => Promise.resolve(mocks.mockTootsApi)),
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

const { loader } = await import('./_app.top-posts/route');

function callLoader(request: Request) {
  return (loader as Function)({ request, params: {}, context: {} });
}

function makeToot(id: string) {
  return {
    id,
    url: `https://mastodon.social/@user/${id}`,
    content: `<p>Post ${id}</p>`,
    createdAt: '2024-01-14T12:00:00Z',
    repliesCount: 3,
    reblogsCount: 7,
    favouritesCount: 15,
  };
}

function makeActivity() {
  return {
    total: 3,
    previousPeriodTotal: 2,
    inProgress: false,
    trend: 0.5,
    bucket: 'day',
    chart: [{ time: '2024-01-14', value: 3 }],
    dateFrom: '2024-01-14',
    dateTo: '2024-01-14',
    days: 1,
    daysWithoutPosts: 0,
    busiestDay: { date: '2024-01-14', count: 3 },
  };
}

const emptySummary = {
  top: { data: [] },
  topByReplies: { data: [] },
  topByBoosts: { data: [] },
  topByFavorites: { data: [] },
};

describe('top-posts loader', () => {
  const user = makeSessionUser();

  beforeEach(() => {
    mocks.mockTootsApi.tootsControllerGetPostActivity.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('transforms API response into 4 category arrays', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockResolvedValue({
      top: { data: [makeToot('1')] },
      topByReplies: { data: [makeToot('2')] },
      topByBoosts: { data: [makeToot('3')] },
      topByFavorites: { data: [makeToot('4')] },
    });

    const request = makeRequestWithSession('http://localhost/top-posts');
    const result = await callLoader(request);

    expect(result.top).toHaveLength(1);
    expect(result.top[0].uri).toBe('1');
    expect(result.topByReplies[0].uri).toBe('2');
    expect(result.topByBoosts[0].uri).toBe('3');
    expect(result.topByFavorites[0].uri).toBe('4');
    expect(result.initialTimeframe).toBe('last30days');
    expect(result.accountId).toBe('acc-1');
  });

  it('maps RankedTootDto fields to Toot fields correctly', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const toot = makeToot('t1');
    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockResolvedValue({
      top: { data: [toot] },
      topByReplies: { data: [] },
      topByBoosts: { data: [] },
      topByFavorites: { data: [] },
    });

    const request = makeRequestWithSession('http://localhost/top-posts');
    const result = await callLoader(request);

    expect(result.top[0]).toEqual({
      uri: toot.id,
      url: toot.url,
      content: toot.content,
      createdAt: toot.createdAt,
      repliesCount: toot.repliesCount,
      reblogsCount: toot.reblogsCount,
      favouritesCount: toot.favouritesCount,
    });
  });

  it('reads timeframe from query param', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockResolvedValue({
      top: { data: [] },
      topByReplies: { data: [] },
      topByBoosts: { data: [] },
      topByFavorites: { data: [] },
    });

    const request = makeRequestWithSession('http://localhost/top-posts?timeframe=last7days');
    const result = await callLoader(request);

    expect(result.initialTimeframe).toBe('last7days');
    expect(mocks.mockTootsApi.tootsControllerGetTopTootsSummary).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'last7days',
    });
  });

  it('returns empty arrays when no accountId', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue(null);

    const request = makeRequestWithSession('http://localhost/top-posts');
    const result = await callLoader(request);

    expect(result).toEqual({
      top: [],
      topByReplies: [],
      topByBoosts: [],
      topByFavorites: [],
      activity: null,
      initialTimeframe: 'last30days',
      initialDateFrom: null,
      initialDateTo: null,
      accountId: null,
    });
  });

  it('returns empty fallback on API failure', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockRejectedValue(new Error('API down'));

    const request = makeRequestWithSession('http://localhost/top-posts');
    const result = await callLoader(request);

    expect(result).toEqual({
      top: [],
      topByReplies: [],
      topByBoosts: [],
      topByFavorites: [],
      activity: null,
      initialTimeframe: 'last30days',
      initialDateFrom: null,
      initialDateTo: null,
      accountId: 'acc-1',
    });
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });

  it('loads post activity for the same timeframe', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');
    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockResolvedValue(emptySummary);
    const activity = makeActivity();
    mocks.mockTootsApi.tootsControllerGetPostActivity.mockResolvedValue(activity);

    const request = makeRequestWithSession(
      'http://localhost/top-posts?timeframe=custom&dateFrom=2024-01-01&dateTo=2024-01-31',
    );
    const result = await callLoader(request);

    expect(mocks.mockTootsApi.tootsControllerGetPostActivity).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'custom',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    });
    expect(result.activity).toEqual(activity);
  });

  it('keeps top posts when loading post activity fails', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');
    mocks.mockTootsApi.tootsControllerGetTopTootsSummary.mockResolvedValue({
      ...emptySummary,
      top: { data: [makeToot('1')] },
    });
    mocks.mockTootsApi.tootsControllerGetPostActivity.mockRejectedValue(new Error('API down'));

    const request = makeRequestWithSession('http://localhost/top-posts');
    const result = await callLoader(request);

    expect(result.top).toHaveLength(1);
    expect(result.activity).toBeNull();
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
