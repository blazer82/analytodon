/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { makeRequestWithSession, makeSessionUser } from '~/test-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockUsersApi: {
    usersControllerFindUserById: vi.fn(),
    usersControllerUpdateUser: vi.fn(),
  },
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('~/utils/session.server', () => ({
  withSessionHandling: vi.fn((fn: Function) => fn),
  requireUser: mocks.mockRequireUser,
}));

vi.mock('~/services/api.server', () => ({
  createUsersApiWithAuth: vi.fn(() => Promise.resolve(mocks.mockUsersApi)),
}));

vi.mock('~/services/logger.server', () => ({
  default: mocks.mockLogger,
}));

const { loader, action } = await import('./_app.admin.users.$userId');

function callLoader(request: Request, params: Record<string, string> = {}) {
  return (loader as Function)({ request, params, context: {} });
}

function callAction(request: Request, params: Record<string, string> = {}) {
  return (action as Function)({ request, params, context: {} });
}

function makePostRequest(url: string, data: Record<string, string>) {
  const formData = new URLSearchParams(data);
  const request = new Request(url, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  request.__apiClientSession = {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    unset: vi.fn(),
  } as never;
  return request;
}

describe('admin user detail loader', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects non-admin to /dashboard', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'account-owner' }));

    const request = makeRequestWithSession('http://localhost/admin/users/user-1');

    await expect(callLoader(request, { userId: 'user-1' })).rejects.toSatisfy((res: Response) => {
      return res instanceof Response && res.status === 302 && res.headers.get('Location') === '/dashboard';
    });
  });

  it('redirects to /admin/users when userId param is missing', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));

    const request = makeRequestWithSession('http://localhost/admin/users/');

    await expect(callLoader(request, {})).rejects.toSatisfy((res: Response) => {
      return res instanceof Response && res.status === 302 && res.headers.get('Location') === '/admin/users';
    });
  });

  it('returns user detail on success', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));

    const userDetail = {
      id: 'user-1',
      email: 'other@example.com',
      role: 'account-owner',
      accounts: [],
    };
    mocks.mockUsersApi.usersControllerFindUserById.mockResolvedValue(userDetail);

    const request = makeRequestWithSession('http://localhost/admin/users/user-1');
    const result = await callLoader(request, { userId: 'user-1' });

    expect(result).toEqual({ userDetail });
    expect(mocks.mockUsersApi.usersControllerFindUserById).toHaveBeenCalledWith({ id: 'user-1' });
  });

  it('redirects to /admin/users on API error', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));
    mocks.mockUsersApi.usersControllerFindUserById.mockRejectedValue(new Error('not found'));

    const request = makeRequestWithSession('http://localhost/admin/users/user-1');

    await expect(callLoader(request, { userId: 'user-1' })).rejects.toSatisfy((res: Response) => {
      return res instanceof Response && res.status === 302 && res.headers.get('Location') === '/admin/users';
    });
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });

  it('re-throws Response errors from API client', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));
    const redirectResponse = new Response(null, { status: 302, headers: { Location: '/login' } });
    mocks.mockUsersApi.usersControllerFindUserById.mockRejectedValue(redirectResponse);

    const request = makeRequestWithSession('http://localhost/admin/users/user-1');

    await expect(callLoader(request, { userId: 'user-1' })).rejects.toBe(redirectResponse);
  });
});

describe('admin user detail action', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects non-admin to /dashboard', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'account-owner' }));

    const request = makePostRequest('http://localhost/admin/users/user-1', { email: 'a@b.com' });

    await expect(callAction(request, { userId: 'user-1' })).rejects.toSatisfy((res: Response) => {
      return res instanceof Response && res.status === 302 && res.headers.get('Location') === '/dashboard';
    });
  });

  it('returns 400 when userId param is missing', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));

    const request = makePostRequest('http://localhost/admin/users/', { email: 'a@b.com' });
    const result = await callAction(request, {});

    expect(result).toBeInstanceOf(Response);
    const body = await (result as Response).json();
    expect(body.error).toBe('User ID is required');
  });

  it('updates user with all fields', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));
    mocks.mockUsersApi.usersControllerUpdateUser.mockResolvedValue({});

    const request = makePostRequest('http://localhost/admin/users/user-1', {
      email: 'new@example.com',
      role: 'admin',
      isActive: 'true',
      emailVerified: 'true',
      maxAccounts: '5',
      timezone: 'Europe/Berlin',
      password: 'newpass123',
    });
    const result = await callAction(request, { userId: 'user-1' });

    expect(mocks.mockUsersApi.usersControllerUpdateUser).toHaveBeenCalledWith({
      id: 'user-1',
      updateUserDto: {
        email: 'new@example.com',
        role: 'admin',
        isActive: true,
        emailVerified: true,
        maxAccounts: 5,
        timezone: 'Europe/Berlin',
        password: 'newpass123',
      },
    });

    const body = await (result as Response).json();
    expect(body.success).toBe(true);
  });

  it('skips empty optional fields', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));
    mocks.mockUsersApi.usersControllerUpdateUser.mockResolvedValue({});

    const request = makePostRequest('http://localhost/admin/users/user-1', {
      email: 'new@example.com',
      role: 'account-owner',
      isActive: 'false',
      emailVerified: 'false',
      maxAccounts: '',
      timezone: '',
      password: '',
    });
    await callAction(request, { userId: 'user-1' });

    const updateCall = mocks.mockUsersApi.usersControllerUpdateUser.mock.calls[0][0];
    expect(updateCall.updateUserDto).not.toHaveProperty('maxAccounts');
    expect(updateCall.updateUserDto).not.toHaveProperty('timezone');
    expect(updateCall.updateUserDto).not.toHaveProperty('password');
  });

  it('returns error JSON on API failure', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));
    mocks.mockUsersApi.usersControllerUpdateUser.mockRejectedValue(new Error('update failed'));

    const request = makePostRequest('http://localhost/admin/users/user-1', {
      email: 'new@example.com',
      role: 'admin',
      isActive: 'true',
      emailVerified: 'true',
      maxAccounts: '',
      timezone: '',
      password: '',
    });
    const result = await callAction(request, { userId: 'user-1' });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(500);
    const body = await (result as Response).json();
    expect(body.error).toBe('errors.failedToUpdate');
  });

  it('re-throws Response errors from API client', async () => {
    mocks.mockRequireUser.mockResolvedValue(makeSessionUser({ role: 'admin' }));
    const redirectResponse = new Response(null, { status: 302, headers: { Location: '/login' } });
    mocks.mockUsersApi.usersControllerUpdateUser.mockRejectedValue(redirectResponse);

    const request = makePostRequest('http://localhost/admin/users/user-1', {
      email: 'new@example.com',
      role: 'admin',
      isActive: 'true',
      emailVerified: 'true',
      maxAccounts: '',
      timezone: '',
      password: '',
    });

    await expect(callAction(request, { userId: 'user-1' })).rejects.toBe(redirectResponse);
  });
});
