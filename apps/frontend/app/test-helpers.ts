import type { AuthResponseDto, SessionUserDto } from '@analytodon/rest-client';
import { vi } from 'vitest';

export function makeSessionUser(overrides: Partial<SessionUserDto> = {}): SessionUserDto {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user',
    emailVerified: true,
    accounts: [{ id: 'acc-1' }] as SessionUserDto['accounts'],
    maxAccounts: 3,
    serverURLOnSignUp: 'https://mastodon.social',
    timezone: 'UTC',
    locale: 'en',
    ...overrides,
  };
}

export function makeAuthResponse(overrides: Partial<AuthResponseDto> = {}): AuthResponseDto {
  return {
    token: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresIn: 3600,
    user: makeSessionUser(),
    ...overrides,
  };
}

export function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

export function makeMockSession(initialData: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initialData));
  return {
    get: vi.fn((key: string) => data.get(key)),
    set: vi.fn((key: string, value: unknown) => data.set(key, value)),
    has: vi.fn((key: string) => data.has(key)),
    unset: vi.fn((key: string) => data.delete(key)),
    _data: data,
  };
}

export function makeRequestWithSession(url: string, sessionData: Record<string, unknown> = {}) {
  const request = new Request(url);
  request.__apiClientSession = makeMockSession(sessionData) as never;
  return request;
}
