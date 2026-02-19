import {
  AccountsApi,
  AdminApi,
  AuthenticationApi,
  BoostsApi,
  FavoritesApi,
  FollowersApi,
  RepliesApi,
  TootsApi,
  UsersApi,
} from '@analytodon/rest-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockCreateApiClientWithAuth: vi.fn(),
  MockConfiguration: vi.fn(),
}));

vi.mock('@analytodon/rest-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@analytodon/rest-client')>();
  return {
    ...actual,
    Configuration: mocks.MockConfiguration,
  };
});

vi.mock('./api-client.server', () => ({
  createApiClientWithAuth: mocks.mockCreateApiClientWithAuth,
  API_BASE_URL: 'http://localhost:3000',
}));

const {
  createAuthApi,
  createUsersApi,
  createAuthApiWithAuth,
  createAccountsApiWithAuth,
  createUsersApiWithAuth,
  createFollowersApiWithAuth,
  createTootsApiWithAuth,
  createBoostsApiWithAuth,
  createRepliesApiWithAuth,
  createFavoritesApiWithAuth,
  createAdminApiWithAuth,
} = await import('./api.server');

describe('createAuthApi', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create AuthenticationApi without token', () => {
    const result = createAuthApi();

    expect(result).toBeInstanceOf(AuthenticationApi);
    expect(mocks.MockConfiguration).toHaveBeenCalledWith({
      basePath: 'http://localhost:3000',
      accessToken: undefined,
    });
  });

  it('should create AuthenticationApi with token', async () => {
    const result = createAuthApi('my-token');

    expect(result).toBeInstanceOf(AuthenticationApi);
    // Verify the accessToken provider resolves to the token
    const configCall = mocks.MockConfiguration.mock.calls[0][0];
    expect(configCall.accessToken).toBeDefined();
    expect(await configCall.accessToken()).toBe('my-token');
  });
});

describe('createUsersApi', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create UsersApi without authentication', () => {
    const result = createUsersApi();

    expect(result).toBeInstanceOf(UsersApi);
    expect(mocks.MockConfiguration).toHaveBeenCalledWith({
      basePath: 'http://localhost:3000',
    });
  });
});

describe('authenticated API factories', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockConfig = { basePath: 'http://localhost:3000' };

  function setupMock() {
    mocks.mockCreateApiClientWithAuth.mockResolvedValue({ config: mockConfig });
  }

  it('createAuthApiWithAuth returns AuthenticationApi', async () => {
    setupMock();
    const result = await createAuthApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(AuthenticationApi);
    expect(mocks.mockCreateApiClientWithAuth).toHaveBeenCalled();
  });

  it('createAccountsApiWithAuth returns AccountsApi', async () => {
    setupMock();
    const result = await createAccountsApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(AccountsApi);
  });

  it('createUsersApiWithAuth returns UsersApi', async () => {
    setupMock();
    const result = await createUsersApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(UsersApi);
  });

  it('createFollowersApiWithAuth returns FollowersApi', async () => {
    setupMock();
    const result = await createFollowersApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(FollowersApi);
  });

  it('createTootsApiWithAuth returns TootsApi', async () => {
    setupMock();
    const result = await createTootsApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(TootsApi);
  });

  it('createBoostsApiWithAuth returns BoostsApi', async () => {
    setupMock();
    const result = await createBoostsApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(BoostsApi);
  });

  it('createRepliesApiWithAuth returns RepliesApi', async () => {
    setupMock();
    const result = await createRepliesApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(RepliesApi);
  });

  it('createFavoritesApiWithAuth returns FavoritesApi', async () => {
    setupMock();
    const result = await createFavoritesApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(FavoritesApi);
  });

  it('createAdminApiWithAuth returns AdminApi', async () => {
    setupMock();
    const result = await createAdminApiWithAuth(new Request('http://localhost'));
    expect(result).toBeInstanceOf(AdminApi);
  });
});
