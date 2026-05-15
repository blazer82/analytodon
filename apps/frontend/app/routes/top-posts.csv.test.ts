/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolveEffectiveAccountId: vi.fn(),
  mockTootsApi: {
    tootsControllerExportCsvRaw: vi.fn(),
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

const { loader } = await import('./top-posts.csv');

function callLoader(request: Request) {
  return (loader as Function)({ request, params: {}, context: {} });
}

describe('top-posts CSV export loader', () => {
  const user = makeSessionUser();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns CSV response with correct headers', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockTootsApi.tootsControllerExportCsvRaw.mockResolvedValue({
      raw: {
        status: 200,
        text: () => Promise.resolve('Date;URL;Visibility;Language;Replies;Boosts;Favorites;Content\n'),
        headers: new Headers({ 'Content-Type': 'text/csv' }),
      },
    });

    const request = makeRequestWithSession('http://localhost/top-posts/csv?timeframe=last7days');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    expect((result as Response).headers.get('Content-Type')).toBe('text/csv');
    expect((result as Response).headers.get('Content-Disposition')).toContain('top-posts-acc-1-last7days.csv');
  });

  it('returns 404 when no accountId resolved', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue(null);

    const request = makeRequestWithSession('http://localhost/top-posts/csv?timeframe=last7days');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
  });

  it('returns 400 when timeframe is missing', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const request = makeRequestWithSession('http://localhost/top-posts/csv');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it('forwards timeframe and custom dates to the API', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockTootsApi.tootsControllerExportCsvRaw.mockResolvedValue({
      raw: { status: 200, text: () => Promise.resolve(''), headers: new Headers() },
    });

    const request = makeRequestWithSession(
      'http://localhost/top-posts/csv?timeframe=custom&dateFrom=2024-01-01&dateTo=2024-01-31',
    );
    await callLoader(request);

    expect(mocks.mockTootsApi.tootsControllerExportCsvRaw).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'custom',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    });
  });

  it('returns 500 on API failure', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockTootsApi.tootsControllerExportCsvRaw.mockRejectedValue(new Error('API error'));

    const request = makeRequestWithSession('http://localhost/top-posts/csv?timeframe=last7days');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
