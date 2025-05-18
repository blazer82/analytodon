import { AuthenticationApi, Configuration } from '@analytodon/rest-client';

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
