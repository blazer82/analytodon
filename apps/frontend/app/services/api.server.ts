import {
  AccountsApi,
  AuthenticationApi,
  BoostsApi,
  Configuration,
  FavoritesApi,
  FollowersApi,
  RepliesApi,
  TootsApi,
  UsersApi,
} from '@analytodon/rest-client';

import { API_BASE_URL, createApiClientWithAuth } from './api-client.server';

/**
 * Creates an instance of the Authentication API client
 * @param accessToken Optional access token for authenticated requests
 */
export function createAuthApi(accessToken?: string): AuthenticationApi {
  const config = new Configuration({
    basePath: API_BASE_URL,
    accessToken: accessToken ? () => Promise.resolve(accessToken) : undefined,
  });

  return new AuthenticationApi(config);
}

/**
 * Creates an authenticated instance of the Authentication API client with token refresh
 */
export async function createAuthApiWithAuth(request: Request): Promise<AuthenticationApi> {
  const { config } = await createApiClientWithAuth(request);
  return new AuthenticationApi(config);
}

/**
 * Creates an authenticated instance of the Accounts API client with token refresh
 */
export async function createAccountsApiWithAuth(request: Request): Promise<AccountsApi> {
  const { config } = await createApiClientWithAuth(request);
  return new AccountsApi(config);
}

/**
 * Creates an authenticated instance of the Users API client with token refresh
 */
export async function createUsersApiWithAuth(request: Request): Promise<UsersApi> {
  const { config } = await createApiClientWithAuth(request);
  return new UsersApi(config);
}

/**
 * Creates an authenticated instance of the Followers API client with token refresh
 */
export async function createFollowersApiWithAuth(request: Request): Promise<FollowersApi> {
  const { config } = await createApiClientWithAuth(request);
  return new FollowersApi(config);
}

/**
 * Creates an authenticated instance of the Toots API client with token refresh
 */
export async function createTootsApiWithAuth(request: Request): Promise<TootsApi> {
  const { config } = await createApiClientWithAuth(request);
  return new TootsApi(config);
}

/**
 * Creates an authenticated instance of the Boosts API client with token refresh
 */
export async function createBoostsApiWithAuth(request: Request): Promise<BoostsApi> {
  const { config } = await createApiClientWithAuth(request);
  return new BoostsApi(config);
}

/**
 * Creates an authenticated instance of the Replies API client with token refresh
 */
export async function createRepliesApiWithAuth(request: Request): Promise<RepliesApi> {
  const { config } = await createApiClientWithAuth(request);
  return new RepliesApi(config);
}

/**
 * Creates an authenticated instance of the Favorites API client with token refresh
 */
export async function createFavoritesApiWithAuth(request: Request): Promise<FavoritesApi> {
  const { config } = await createApiClientWithAuth(request);
  return new FavoritesApi(config);
}
