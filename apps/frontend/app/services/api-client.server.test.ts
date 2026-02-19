import { makeMockSession } from '~/test-helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
  mockRefreshAccessToken: vi.fn(),
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@remix-run/node', () => ({
  redirect: mocks.mockRedirect,
}));

vi.mock('~/utils/session.server', () => ({
  refreshAccessToken: mocks.mockRefreshAccessToken,
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

const { createApiClientWithAuth } = await import('./api-client.server');

describe('createApiClientWithAuth', () => {
  beforeEach(() => {
    mocks.mockRedirect.mockImplementation((url: string) => {
      return new Response(null, { status: 302, headers: { Location: url } });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should throw redirect when no session on request', async () => {
    const request = new Request('http://localhost');
    // No __apiClientSession

    await expect(createApiClientWithAuth(request)).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('should throw redirect when no accessToken in session', async () => {
    const request = new Request('http://localhost');
    request.__apiClientSession = makeMockSession({ refreshToken: 'rt-456' }) as never;

    await expect(createApiClientWithAuth(request)).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('should throw redirect when no refreshToken in session', async () => {
    const request = new Request('http://localhost');
    request.__apiClientSession = makeMockSession({ accessToken: 'at-123' }) as never;

    await expect(createApiClientWithAuth(request)).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login');
  });
});

describe('customFetch (via config.fetchApi)', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;

    mocks.mockRedirect.mockImplementation((url: string) => {
      return new Response(null, { status: 302, headers: { Location: url } });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  async function getConfig(sessionData: Record<string, unknown> = {}) {
    const request = new Request('http://localhost');
    request.__apiClientSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      ...sessionData,
    }) as never;
    return { ...(await createApiClientWithAuth(request)), request };
  }

  it('should resolve relative URLs against basePath', async () => {
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));
    const { config } = await getConfig();

    await config.fetchApi!.call(config, 'api/users', {});

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/users'), expect.anything());
  });

  it('should pass absolute URLs as-is', async () => {
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));
    const { config } = await getConfig();

    await config.fetchApi!.call(config, 'https://other.example.com/api', {});

    expect(mockFetch).toHaveBeenCalledWith('https://other.example.com/api', expect.anything());
  });

  it('should handle URL objects', async () => {
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));
    const { config } = await getConfig();

    await config.fetchApi!.call(config, new URL('https://example.com/test'), {});

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/test', expect.anything());
  });

  it('should return response on success', async () => {
    const expectedResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValue(expectedResponse);
    const { config } = await getConfig();

    const result = await config.fetchApi!.call(config, 'https://example.com/test', {});

    expect(result).toBe(expectedResponse);
  });

  it('should attempt token refresh on 401 response', async () => {
    const authResponse = {
      token: 'new-at',
      refreshToken: 'new-rt',
      expiresIn: 3600,
      user: { id: 'user-1' },
    };
    mockFetch
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    mocks.mockRefreshAccessToken.mockResolvedValue(authResponse);

    const { config } = await getConfig();
    const result = await config.fetchApi!.call(config, 'https://example.com/api', {});

    expect(mocks.mockRefreshAccessToken).toHaveBeenCalledWith('rt-456', undefined);
    expect(result.status).toBe(200);
  });

  it('should throw redirect when no refresh token during 401', async () => {
    mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const request = new Request('http://localhost');
    const session = makeMockSession({ accessToken: 'at-123', refreshToken: 'rt-456' });
    request.__apiClientSession = session as never;
    const { config } = await createApiClientWithAuth(request);

    // Remove refreshToken from session to simulate it being missing at 401 time
    session._data.delete('refreshToken');

    await expect(config.fetchApi!.call(config, 'https://example.com/api', {})).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('should throw redirect when refresh fails on 401', async () => {
    mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    mocks.mockRefreshAccessToken.mockResolvedValue(null);

    const { config } = await getConfig();

    await expect(config.fetchApi!.call(config, 'https://example.com/api', {})).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('should update session after successful refresh', async () => {
    const authResponse = {
      token: 'new-at',
      refreshToken: 'new-rt',
      expiresIn: 3600,
      user: { id: 'user-1' },
    };
    mockFetch
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    mocks.mockRefreshAccessToken.mockResolvedValue(authResponse);

    const { config, request } = await getConfig();
    await config.fetchApi!.call(config, 'https://example.com/api', {});

    const session = request.__apiClientSession!;
    expect(session.set).toHaveBeenCalledWith('accessToken', 'new-at');
    expect(session.set).toHaveBeenCalledWith('refreshToken', 'new-rt');
    expect(session.set).toHaveBeenCalledWith('userId', 'user-1');
  });

  it('should re-throw Response errors', async () => {
    const errorResponse = new Response(null, { status: 302, headers: { Location: '/somewhere' } });
    mockFetch.mockRejectedValue(errorResponse);

    const { config } = await getConfig();

    await expect(config.fetchApi!.call(config, 'https://example.com/api', {})).rejects.toBe(errorResponse);
  });

  it('should log and re-throw other errors', async () => {
    const error = new Error('Network failure');
    mockFetch.mockRejectedValue(error);

    const { config } = await getConfig();

    await expect(config.fetchApi!.call(config, 'https://example.com/api', {})).rejects.toThrow('Network failure');
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });
});
