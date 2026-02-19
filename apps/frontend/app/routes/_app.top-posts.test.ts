/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolveEffectiveAccountId: vi.fn(),
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

describe('top-posts loader', () => {
  const user = makeSessionUser();

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
      initialTimeframe: 'last30days',
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
      initialTimeframe: 'last30days',
      accountId: 'acc-1',
    });
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
