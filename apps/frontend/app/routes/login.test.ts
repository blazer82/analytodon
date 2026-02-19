/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeAuthResponse, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateUserSession: vi.fn(),
  mockAuthApi: {
    authControllerLogin: vi.fn(),
  },
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('~/utils/session.server', () => ({
  withSessionHandling: vi.fn((fn: Function) => fn),
  getUser: mocks.mockGetUser,
  createUserSession: mocks.mockCreateUserSession,
}));

vi.mock('~/services/api.server', () => ({
  createAuthApi: vi.fn(() => mocks.mockAuthApi),
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

const { loader, action } = await import('./login');

function callLoader(request: Request) {
  return (loader as Function)({ request, params: {}, context: {} });
}

function makeFormRequest(data: Record<string, string>, headers?: Record<string, string>) {
  const formData = new URLSearchParams(data);
  return new Request('http://localhost/login', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
  });
}

describe('login loader', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects authenticated user to /', async () => {
    mocks.mockGetUser.mockResolvedValue(makeSessionUser());

    const request = new Request('http://localhost/login');
    const result = await callLoader(request);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get('Location')).toBe('/');
  });

  it('returns login data for unauthenticated user', async () => {
    mocks.mockGetUser.mockResolvedValue(null);

    const request = new Request('http://localhost/login');
    const result = await callLoader(request);

    expect(result).toEqual({
      isRegistrationDisabled: false,
      message: null,
    });
  });

  it('reads DISABLE_NEW_REGISTRATIONS env var', async () => {
    mocks.mockGetUser.mockResolvedValue(null);
    const original = process.env.DISABLE_NEW_REGISTRATIONS;
    process.env.DISABLE_NEW_REGISTRATIONS = 'true';

    try {
      const request = new Request('http://localhost/login');
      const result = await callLoader(request);
      expect(result.isRegistrationDisabled).toBe(true);
    } finally {
      process.env.DISABLE_NEW_REGISTRATIONS = original;
    }
  });

  it('reads message from query param', async () => {
    mocks.mockGetUser.mockResolvedValue(null);

    const request = new Request('http://localhost/login?message=session-expired');
    const result = await callLoader(request);

    expect(result.message).toBe('session-expired');
  });
});

describe('login action', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const request = makeFormRequest({ password: 'secret' });
    const result = await action({ request, params: {}, context: {} });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
    const body = await (result as Response).json();
    expect(body.error).toBe('Email and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const request = makeFormRequest({ email: 'user@example.com' });
    const result = await action({ request, params: {}, context: {} });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it('calls createUserSession on successful login', async () => {
    const authResponse = makeAuthResponse();
    mocks.mockAuthApi.authControllerLogin.mockResolvedValue(authResponse);

    const sessionResponse = new Response(null, { status: 302, headers: { Location: '/' } });
    mocks.mockCreateUserSession.mockResolvedValue(sessionResponse);

    const request = makeFormRequest({ email: 'user@example.com', password: 'secret' });
    const result = await action({ request, params: {}, context: {} });

    expect(mocks.mockAuthApi.authControllerLogin).toHaveBeenCalledWith({
      loginDto: { email: 'user@example.com', password: 'secret' },
      acceptLanguage: undefined,
    });
    expect(mocks.mockCreateUserSession).toHaveBeenCalledWith(authResponse, '/');
    expect(result).toBe(sessionResponse);
  });

  it('returns 401 for invalid credentials', async () => {
    mocks.mockAuthApi.authControllerLogin.mockRejectedValue({
      response: { status: 401 },
    });

    const request = makeFormRequest({ email: 'user@example.com', password: 'wrong' });
    const result = await action({ request, params: {}, context: {} });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    const body = await (result as Response).json();
    expect(body.error).toBe('Invalid email or password');
  });

  it('returns 429 for rate-limited requests', async () => {
    mocks.mockAuthApi.authControllerLogin.mockRejectedValue({
      response: { status: 429 },
    });

    const request = makeFormRequest({ email: 'user@example.com', password: 'secret' });
    const result = await action({ request, params: {}, context: {} });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(429);
    const body = await (result as Response).json();
    expect(body.error).toContain('Too many login attempts');
  });

  it('returns 500 for unexpected errors', async () => {
    mocks.mockAuthApi.authControllerLogin.mockRejectedValue(new Error('network failure'));

    const request = makeFormRequest({ email: 'user@example.com', password: 'secret' });
    const result = await action({ request, params: {}, context: {} });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    const body = await (result as Response).json();
    expect(body.error).toContain('An error occurred during login');
  });

  it('forwards Accept-Language header to API', async () => {
    const authResponse = makeAuthResponse();
    mocks.mockAuthApi.authControllerLogin.mockResolvedValue(authResponse);
    mocks.mockCreateUserSession.mockResolvedValue(new Response(null, { status: 302 }));

    const request = makeFormRequest({ email: 'user@example.com', password: 'secret' }, { 'Accept-Language': 'de-DE' });
    await action({ request, params: {}, context: {} });

    expect(mocks.mockAuthApi.authControllerLogin).toHaveBeenCalledWith({
      loginDto: { email: 'user@example.com', password: 'secret' },
      acceptLanguage: 'de-DE',
    });
  });
});
