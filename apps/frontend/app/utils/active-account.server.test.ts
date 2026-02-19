import type { SessionUserDto } from '@analytodon/rest-client';
import { describe, expect, it } from 'vitest';

import { resolveEffectiveAccountId } from './active-account.server';

function makeUser(overrides: Partial<SessionUserDto> = {}): SessionUserDto {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user',
    accounts: [],
    ...overrides,
  } as SessionUserDto;
}

function makeRequest(url: string): Request {
  return new Request(url);
}

function makeSession(data: Record<string, unknown> = {}): { get(key: string): unknown } {
  return {
    get(key: string) {
      return data[key];
    },
  };
}

describe('resolveEffectiveAccountId', () => {
  it('should return viewAs param when user is admin with viewAs', () => {
    const user = makeUser({ role: 'admin', accounts: [{ id: 'acc-1' }] as SessionUserDto['accounts'] });
    const request = makeRequest('http://localhost/dashboard?viewAs=acc-target');
    const session = makeSession({ activeAccountId: 'acc-1' });

    const result = resolveEffectiveAccountId(request, user, session);

    expect(result).toBe('acc-target');
  });

  it('should fall back to session account when admin has no viewAs', () => {
    const user = makeUser({
      role: 'admin',
      accounts: [{ id: 'acc-1' }, { id: 'acc-2' }] as SessionUserDto['accounts'],
    });
    const request = makeRequest('http://localhost/dashboard');
    const session = makeSession({ activeAccountId: 'acc-2' });

    const result = resolveEffectiveAccountId(request, user, session);

    expect(result).toBe('acc-2');
  });

  it('should ignore viewAs param for non-admin users', () => {
    const user = makeUser({
      role: 'user',
      accounts: [{ id: 'acc-1' }] as SessionUserDto['accounts'],
    });
    const request = makeRequest('http://localhost/dashboard?viewAs=acc-target');
    const session = makeSession({ activeAccountId: 'acc-1' });

    const result = resolveEffectiveAccountId(request, user, session);

    expect(result).toBe('acc-1');
  });

  it('should return session activeAccountId when it matches a user account', () => {
    const user = makeUser({
      accounts: [{ id: 'acc-1' }, { id: 'acc-2' }] as SessionUserDto['accounts'],
    });
    const request = makeRequest('http://localhost/dashboard');
    const session = makeSession({ activeAccountId: 'acc-2' });

    const result = resolveEffectiveAccountId(request, user, session);

    expect(result).toBe('acc-2');
  });

  it('should return first account when no activeAccountId in session', () => {
    const user = makeUser({
      accounts: [{ id: 'acc-first' }, { id: 'acc-second' }] as SessionUserDto['accounts'],
    });
    const request = makeRequest('http://localhost/dashboard');
    const session = makeSession();

    const result = resolveEffectiveAccountId(request, user, session);

    expect(result).toBe('acc-first');
  });

  it('should return null when user has no accounts', () => {
    const user = makeUser({ accounts: [] });
    const request = makeRequest('http://localhost/dashboard');
    const session = makeSession();

    const result = resolveEffectiveAccountId(request, user, session);

    expect(result).toBeNull();
  });
});
