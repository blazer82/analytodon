import { Configuration } from '@analytodon/rest-client';
import { redirect } from '@remix-run/node';
import { refreshAccessToken, sessionStorage } from '~/utils/session.server';

// Base URL for the API
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Creates an authenticated API client configuration with token refresh capability
 */
export async function createApiClientWithAuth(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const initialAccessToken = session.get('accessToken');
  const refreshToken = session.get('refreshToken');

  if (!initialAccessToken || !refreshToken) {
    throw redirect('/login');
  }

  // Dynamically provides the current access token from the session
  const dynamicAccessTokenProvider = () => {
    return Promise.resolve(session.get('accessToken') as string);
  };

  // Base configuration using the dynamic token provider from the start
  const baseConfig = new Configuration({
    basePath: API_BASE_URL,
    accessToken: dynamicAccessTokenProvider,
  });

  const originalFetch = baseConfig.fetchApi || fetch; // Default to global fetch

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      // First attempt uses token from dynamicAccessTokenProvider via OpenAPI runtime
      const response = await originalFetch(input, init);

      if (response.status === 401) {
        const currentRefreshToken = session.get('refreshToken') as string; // Use latest refresh token
        const newAuthResponse = await refreshAccessToken(currentRefreshToken);

        if (!newAuthResponse) {
          throw redirect('/login');
        }

        session.set('accessToken', newAuthResponse.token);
        session.set('refreshToken', newAuthResponse.refreshToken);
        session.set('user', newAuthResponse.user);

        const newHeaders = new Headers(init?.headers);
        newHeaders.set('Authorization', `Bearer ${newAuthResponse.token}`);
        const retryInit = { ...init, headers: newHeaders };

        const cookie = await sessionStorage.commitSession(session);
        (request as { __newSessionCookie?: string }).__newSessionCookie = cookie; // TODO: Consider type augmentation for request

        return originalFetch(input, retryInit);
      }
      return response;
    } catch (error) {
      if (error instanceof Response) {
        // Re-throw any Response (like redirects)
        throw error;
      }
      console.error('API request failed:', error);
      throw error;
    }
  };

  // Final configuration with the custom fetch wrapper
  const finalConfig = new Configuration({
    ...baseConfig, // Spreads basePath and dynamicAccessTokenProvider
    fetchApi: customFetch,
  });

  return { config: finalConfig, session };
}
