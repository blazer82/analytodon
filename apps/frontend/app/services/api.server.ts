import { AccountsApi, AuthenticationApi, Configuration, UsersApi } from '@analytodon/rest-client';

import { createApiClientWithAuth } from './api-client.server';

// Base URL for the API
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

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
