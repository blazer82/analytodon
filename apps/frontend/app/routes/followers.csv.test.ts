/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolveEffectiveAccountId: vi.fn(),
  mockFollowersApi: {
    followersControllerExportCsvRaw: vi.fn(),
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

const { loader } = await import('./followers.csv');

function callLoader(request: Request) {
  return (loader as Function)({ request, params: {}, context: {} });
}

describe('followers CSV export loader', () => {
  const user = makeSessionUser();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns CSV response with correct headers', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const csvBlob = new Blob(['date,followers\n2024-01-14,1000'], { type: 'text/csv' });
    mocks.mockFollowersApi.followersControllerExportCsvRaw.mockResolvedValue({
      raw: { blob: () => Promise.resolve(csvBlob) },
    });

    const request = makeRequestWithSession('http://localhost/followers/csv?accountId=acc-1');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    expect((result as Response).headers.get('Content-Type')).toBe('text/csv');
    expect((result as Response).headers.get('Content-Disposition')).toContain('followers_export_acc-1');
  });

  it('returns 404 when no accountId', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue(null);

    const request = makeRequestWithSession('http://localhost/followers/csv');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
  });

  it('defaults timeframe to last30days', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const csvBlob = new Blob(['data'], { type: 'text/csv' });
    mocks.mockFollowersApi.followersControllerExportCsvRaw.mockResolvedValue({
      raw: { blob: () => Promise.resolve(csvBlob) },
    });

    const request = makeRequestWithSession('http://localhost/followers/csv');
    await callLoader(request);

    expect(mocks.mockFollowersApi.followersControllerExportCsvRaw).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'last30days',
    });
  });

  it('reads timeframe from query param', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    const csvBlob = new Blob(['data'], { type: 'text/csv' });
    mocks.mockFollowersApi.followersControllerExportCsvRaw.mockResolvedValue({
      raw: { blob: () => Promise.resolve(csvBlob) },
    });

    const request = makeRequestWithSession('http://localhost/followers/csv?timeframe=last7days');
    await callLoader(request);

    expect(mocks.mockFollowersApi.followersControllerExportCsvRaw).toHaveBeenCalledWith({
      accountId: 'acc-1',
      timeframe: 'last7days',
    });
  });

  it('returns 500 on API failure', async () => {
    mocks.mockRequireUser.mockResolvedValue(user);
    mocks.mockResolveEffectiveAccountId.mockReturnValue('acc-1');

    mocks.mockFollowersApi.followersControllerExportCsvRaw.mockRejectedValue(new Error('API error'));

    const request = makeRequestWithSession('http://localhost/followers/csv');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
