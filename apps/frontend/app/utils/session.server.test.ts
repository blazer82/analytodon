import type { SessionUserDto } from '@analytodon/rest-client';
import { makeAuthResponse, makeMockSession, makeSessionUser } from '~/test-helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks — these must be declared before vi.mock() calls
const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockCommitSession = vi.fn();
  const mockDestroySession = vi.fn();

  return {
    mockGetSession,
    mockCommitSession,
    mockDestroySession,
    mockRedirect: vi.fn(),
    mockCreateCookieSessionStorage: vi.fn(() => ({
      getSession: mockGetSession,
      commitSession: mockCommitSession,
      destroySession: mockDestroySession,
    })),
    mockCreateAuthApi: vi.fn(),
    mockLogger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

vi.mock('@remix-run/node', () => ({
  createCookieSessionStorage: mocks.mockCreateCookieSessionStorage,
  redirect: mocks.mockRedirect,
}));

vi.mock('~/services/api.server', () => ({
  createAuthApi: mocks.mockCreateAuthApi,
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

// Import after mocks are set up
const { createUserSession, getUserSession, getUser, requireUser, logout, refreshAccessToken, withSessionHandling } =
  await import('./session.server');

describe('createUserSession', () => {
  let mockSession: ReturnType<typeof makeMockSession>;

  beforeEach(() => {
    mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCommitSession.mockResolvedValue('session-cookie-value');
    mocks.mockRedirect.mockImplementation((url: string, init?: ResponseInit) => {
      return new Response(null, { status: 302, headers: { Location: url, ...init?.headers } });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set tokens and userId in session', async () => {
    const authResponse = makeAuthResponse();
    await createUserSession(authResponse, '/dashboard');

    expect(mockSession.set).toHaveBeenCalledWith('accessToken', authResponse.token);
    expect(mockSession.set).toHaveBeenCalledWith('refreshToken', authResponse.refreshToken);
    expect(mockSession.set).toHaveBeenCalledWith('userId', authResponse.user.id);
  });

  it('should redirect to the target URL', async () => {
    const authResponse = makeAuthResponse();
    await createUserSession(authResponse, '/dashboard');

    expect(mocks.mockRedirect).toHaveBeenCalledWith('/dashboard', {
      headers: { 'Set-Cookie': 'session-cookie-value' },
    });
  });
});

describe('getUserSession', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return session data when all fields are present', async () => {
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
      activeAccountId: 'acc-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    const result = await getUserSession(new Request('http://localhost'));

    expect(result).toEqual({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
      activeAccountId: 'acc-1',
    });
  });

  it('should return null when accessToken is missing', async () => {
    const mockSession = makeMockSession({ refreshToken: 'rt-456', userId: 'user-1' });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    const result = await getUserSession(new Request('http://localhost'));
    expect(result).toBeNull();
  });

  it('should return null when refreshToken is missing', async () => {
    const mockSession = makeMockSession({ accessToken: 'at-123', userId: 'user-1' });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    const result = await getUserSession(new Request('http://localhost'));
    expect(result).toBeNull();
  });

  it('should return null when userId is missing', async () => {
    const mockSession = makeMockSession({ accessToken: 'at-123', refreshToken: 'rt-456' });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    const result = await getUserSession(new Request('http://localhost'));
    expect(result).toBeNull();
  });

  it('should handle missing activeAccountId gracefully', async () => {
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    const result = await getUserSession(new Request('http://localhost'));
    expect(result).toEqual({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
      activeAccountId: undefined,
    });
  });
});

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call auth API with refresh token', async () => {
    const authResponse = makeAuthResponse();
    const mockRefresh = vi.fn().mockResolvedValue(authResponse);
    mocks.mockCreateAuthApi.mockReturnValue({ authControllerRefreshTokens: mockRefresh });

    await refreshAccessToken('rt-456');

    expect(mockRefresh).toHaveBeenCalledWith({
      refreshTokenDto: { refreshToken: 'rt-456' },
      acceptLanguage: undefined,
    });
  });

  it('should return the auth response on success', async () => {
    const authResponse = makeAuthResponse();
    const mockRefresh = vi.fn().mockResolvedValue(authResponse);
    mocks.mockCreateAuthApi.mockReturnValue({ authControllerRefreshTokens: mockRefresh });

    const result = await refreshAccessToken('rt-456');
    expect(result).toBe(authResponse);
  });

  it('should forward acceptLanguage parameter', async () => {
    const mockRefresh = vi.fn().mockResolvedValue(makeAuthResponse());
    mocks.mockCreateAuthApi.mockReturnValue({ authControllerRefreshTokens: mockRefresh });

    await refreshAccessToken('rt-456', 'en-US,en;q=0.9');

    expect(mockRefresh).toHaveBeenCalledWith({
      refreshTokenDto: { refreshToken: 'rt-456' },
      acceptLanguage: 'en-US,en;q=0.9',
    });
  });

  it('should return null on failure', async () => {
    const mockRefresh = vi.fn().mockRejectedValue(new Error('Network error'));
    mocks.mockCreateAuthApi.mockReturnValue({ authControllerRefreshTokens: mockRefresh });

    const result = await refreshAccessToken('rt-456');
    expect(result).toBeNull();
  });
});

describe('getUser', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no session exists', async () => {
    mocks.mockGetSession.mockResolvedValue(makeMockSession({}));

    const result = await getUser(new Request('http://localhost'));
    expect(result).toBeNull();
  });

  it('should return user profile on success', async () => {
    const user = makeSessionUser();
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCreateAuthApi.mockReturnValue({
      authControllerGetProfile: vi.fn().mockResolvedValue(user),
    });

    const result = await getUser(new Request('http://localhost'));
    expect(result).toBe(user);
  });

  it('should attempt token refresh on 401 error', async () => {
    const user = makeSessionUser();
    const newAuth = makeAuthResponse({ token: 'new-at' });
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    // First API call fails with 401
    const mockGetProfile401 = vi.fn().mockRejectedValue({ response: { status: 401 } });
    const mockGetProfileRetry = vi.fn().mockResolvedValue(user);

    mocks.mockCreateAuthApi
      .mockReturnValueOnce({ authControllerGetProfile: mockGetProfile401 })
      // For refreshAccessToken
      .mockReturnValueOnce({
        authControllerRefreshTokens: vi.fn().mockResolvedValue(newAuth),
      })
      // For retry
      .mockReturnValueOnce({ authControllerGetProfile: mockGetProfileRetry });

    const request = new Request('http://localhost');
    request.__apiClientSession = mockSession as never;

    const result = await getUser(request);
    expect(result).toBe(user);
  });

  it('should update session tokens after successful refresh', async () => {
    const user = makeSessionUser();
    const newAuth = makeAuthResponse({ token: 'new-at', refreshToken: 'new-rt' });
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    mocks.mockCreateAuthApi
      .mockReturnValueOnce({
        authControllerGetProfile: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      })
      .mockReturnValueOnce({
        authControllerRefreshTokens: vi.fn().mockResolvedValue(newAuth),
      })
      .mockReturnValueOnce({
        authControllerGetProfile: vi.fn().mockResolvedValue(user),
      });

    const request = new Request('http://localhost');
    request.__apiClientSession = mockSession as never;

    await getUser(request);

    expect(mockSession.set).toHaveBeenCalledWith('accessToken', 'new-at');
    expect(mockSession.set).toHaveBeenCalledWith('refreshToken', 'new-rt');
  });

  it('should return null when token refresh fails', async () => {
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);

    mocks.mockCreateAuthApi
      .mockReturnValueOnce({
        authControllerGetProfile: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      })
      .mockReturnValueOnce({
        authControllerRefreshTokens: vi.fn().mockRejectedValue(new Error('refresh failed')),
      });

    const request = new Request('http://localhost');
    request.__apiClientSession = mockSession as never;

    const result = await getUser(request);
    expect(result).toBeNull();
  });

  it('should return null on non-401 errors', async () => {
    const mockSession = makeMockSession({
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      userId: 'user-1',
    });
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCreateAuthApi.mockReturnValue({
      authControllerGetProfile: vi.fn().mockRejectedValue(new Error('Server error')),
    });

    const result = await getUser(new Request('http://localhost'));
    expect(result).toBeNull();
  });
});

describe('requireUser', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setupGetUserMock(user: SessionUserDto | null) {
    if (user) {
      const mockSession = makeMockSession({
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        userId: user.id,
      });
      mocks.mockGetSession.mockResolvedValue(mockSession);
      mocks.mockCreateAuthApi.mockReturnValue({
        authControllerGetProfile: vi.fn().mockResolvedValue(user),
      });
    } else {
      mocks.mockGetSession.mockResolvedValue(makeMockSession({}));
    }
  }

  it('should return verified user with accounts', async () => {
    const user = makeSessionUser();
    setupGetUserMock(user);
    mocks.mockRedirect.mockImplementation(
      (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    );

    const result = await requireUser(new Request('http://localhost/dashboard'));
    expect(result).toBe(user);
  });

  it('should redirect to /login when no user', async () => {
    setupGetUserMock(null);
    const redirectResponse = new Response(null, { status: 302 });
    mocks.mockRedirect.mockReturnValue(redirectResponse);

    await expect(requireUser(new Request('http://localhost/dashboard'))).rejects.toBe(redirectResponse);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('should redirect to custom URL when no user', async () => {
    setupGetUserMock(null);
    const redirectResponse = new Response(null, { status: 302 });
    mocks.mockRedirect.mockReturnValue(redirectResponse);

    await expect(requireUser(new Request('http://localhost/dashboard'), '/custom-login')).rejects.toBe(
      redirectResponse,
    );
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/custom-login');
  });

  it('should redirect to /register/verify for unverified email', async () => {
    const user = makeSessionUser({ emailVerified: false });
    setupGetUserMock(user);
    const redirectResponse = new Response(null, { status: 302 });
    mocks.mockRedirect.mockReturnValue(redirectResponse);

    await expect(requireUser(new Request('http://localhost/dashboard'))).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/register/verify');
  });

  it('should not redirect when already on /register/verify', async () => {
    const user = makeSessionUser({ emailVerified: false });
    setupGetUserMock(user);

    const result = await requireUser(new Request('http://localhost/register/verify'));
    expect(result).toBe(user);
  });

  it('should redirect to /accounts/connect when user has no accounts', async () => {
    const user = makeSessionUser({ accounts: [] });
    setupGetUserMock(user);
    const redirectResponse = new Response(null, { status: 302 });
    mocks.mockRedirect.mockReturnValue(redirectResponse);

    await expect(requireUser(new Request('http://localhost/dashboard'))).rejects.toBeInstanceOf(Response);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/accounts/connect');
  });

  it('should not redirect when already on /accounts/connect', async () => {
    const user = makeSessionUser({ accounts: [] });
    setupGetUserMock(user);

    const result = await requireUser(new Request('http://localhost/accounts/connect'));
    expect(result).toBe(user);
  });

  it('should not redirect when on /accounts/connect/callback', async () => {
    const user = makeSessionUser({ accounts: [] });
    setupGetUserMock(user);

    const result = await requireUser(new Request('http://localhost/accounts/connect/callback'));
    expect(result).toBe(user);
  });
});

describe('logout', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should destroy session and redirect', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockDestroySession.mockResolvedValue('destroyed-cookie');
    mocks.mockRedirect.mockImplementation((url: string, init?: ResponseInit) => {
      return new Response(null, { status: 302, headers: { Location: url, ...init?.headers } });
    });

    await logout(new Request('http://localhost'));

    expect(mocks.mockDestroySession).toHaveBeenCalledWith(mockSession);
    expect(mocks.mockRedirect).toHaveBeenCalledWith('/login', {
      headers: { 'Set-Cookie': 'destroyed-cookie' },
    });
  });

  it('should redirect to custom URL', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockDestroySession.mockResolvedValue('destroyed-cookie');
    mocks.mockRedirect.mockImplementation((url: string, init?: ResponseInit) => {
      return new Response(null, { status: 302, headers: { Location: url, ...init?.headers } });
    });

    await logout(new Request('http://localhost'), '/goodbye');

    expect(mocks.mockRedirect).toHaveBeenCalledWith('/goodbye', {
      headers: { 'Set-Cookie': 'destroyed-cookie' },
    });
  });
});

describe('withSessionHandling', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should attach session to request and return JSON for data responses', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCommitSession.mockResolvedValue('committed-cookie');

    const loader = vi.fn().mockResolvedValue({ hello: 'world' });
    const wrapped = withSessionHandling(loader);

    const request = new Request('http://localhost/dashboard');
    const response = await wrapped({ request, params: {}, context: {} });

    // Should have attached session
    expect(request.__apiClientSession).toBe(mockSession);

    // Should return JSON response with committed cookie
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('Set-Cookie')).toBe('committed-cookie');
    expect(await response.json()).toEqual({ hello: 'world' });
  });

  it('should commit session and merge headers for Response returns', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCommitSession.mockResolvedValue('committed-cookie');

    const originalResponse = new Response(JSON.stringify({ data: 1 }), {
      status: 200,
      headers: { 'X-Custom': 'header' },
    });
    const loader = vi.fn().mockResolvedValue(originalResponse);
    const wrapped = withSessionHandling(loader);

    const response = await wrapped({
      request: new Request('http://localhost'),
      params: {},
      context: {},
    });

    expect(response.headers.get('X-Custom')).toBe('header');
    expect(response.headers.get('Set-Cookie')).toBe('committed-cookie');
  });

  it('should commit session for thrown Response (redirect)', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCommitSession.mockResolvedValue('committed-cookie');

    const thrownRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' },
    });
    const loader = vi.fn().mockRejectedValue(thrownRedirect);
    const wrapped = withSessionHandling(loader);

    const response = await wrapped({
      request: new Request('http://localhost'),
      params: {},
      context: {},
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
    expect(response.headers.get('Set-Cookie')).toBe('committed-cookie');
  });

  it('should re-throw errors after committing session', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCommitSession.mockResolvedValue('committed-cookie');

    const error = new Error('Something broke');
    const loader = vi.fn().mockRejectedValue(error);
    const wrapped = withSessionHandling(loader);

    await expect(wrapped({ request: new Request('http://localhost'), params: {}, context: {} })).rejects.toThrow(
      'Something broke',
    );

    // Session commit was still attempted
    expect(mocks.mockCommitSession).toHaveBeenCalled();
  });

  it('should handle non-Error thrown values', async () => {
    const mockSession = makeMockSession();
    mocks.mockGetSession.mockResolvedValue(mockSession);
    mocks.mockCommitSession.mockResolvedValue('committed-cookie');

    const loader = vi.fn().mockRejectedValue('string error');
    const wrapped = withSessionHandling(loader);

    await expect(wrapped({ request: new Request('http://localhost'), params: {}, context: {} })).rejects.toThrow(
      'An unknown error occurred',
    );

    expect(mocks.mockCommitSession).toHaveBeenCalled();
  });
});
