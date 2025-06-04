import { Configuration } from '@analytodon/rest-client';
import { redirect } from '@remix-run/node';
import logger from '~/services/logger.server';
import { refreshAccessToken } from '~/utils/session.server';

// Base URL for the API
export const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Creates an authenticated API client configuration with token refresh capability.
 * Expects `request.__apiClientSession` to be populated by `withSessionHandling` HOF.
 */
export async function createApiClientWithAuth(request: Request) {
  const session = request.__apiClientSession;

  if (!session) {
    // This should ideally not happen if loaders are correctly wrapped.
    logger.error('Session not found on request. Ensure loader is wrapped with withSessionHandling.');
    throw redirect('/login'); // Or a more specific error
  }

  const initialAccessToken = session.get('accessToken') as string | undefined;
  const initialRefreshToken = session.get('refreshToken') as string | undefined;

  if (!initialAccessToken || !initialRefreshToken) {
    // If tokens are missing from the session object provided by HOF, redirect to login.
    throw redirect('/login');
  }

  // Dynamically provides the current access token from the request-scoped session
  const dynamicAccessTokenProvider = () => {
    // Ensure session is still valid and has the token
    const currentSession = request.__apiClientSession;
    if (!currentSession) {
      // This case should be rare, implies session was removed from request mid-flight
      throw new Error('Session disappeared from request during token provision.');
    }
    const token = currentSession.get('accessToken') as string | undefined;
    if (!token) {
      throw new Error('Access token missing from session during token provision.');
    }
    return Promise.resolve(token);
  };

  // This config is primarily to get a fetcher that might be more than global fetch,
  // and to ensure it's configured similarly regarding basePath if needed for its internal logic.
  const baseConfigForFetcher = new Configuration({
    basePath: API_BASE_URL,
    accessToken: dynamicAccessTokenProvider, // Match token provider logic if fetchApi uses it
  });

  const customFetch = async function (this: Configuration, input: RequestInfo | URL, init?: RequestInit) {
    let absoluteInputUrl: string;

    if (typeof input === 'string') {
      // Check if input is already an absolute URL
      if (input.startsWith('http://') || input.startsWith('https://')) {
        absoluteInputUrl = input;
      } else {
        // Input is a relative path, prepend basePath from 'this' (finalConfig)
        const basePath = (this.basePath || '').replace(/\/$/, ''); // Ensure no trailing slash
        const relativePath = input.replace(/^\//, ''); // Ensure no leading slash
        absoluteInputUrl = `${basePath}/${relativePath}`;
      }
    } else if (input instanceof URL) {
      absoluteInputUrl = input.href;
    } else {
      // input is a Request object
      absoluteInputUrl = input.url;
      // If init is not provided by the caller, derive from the Request object
      // This is important as the original Request object's properties should be used if init is undefined.
      if (init === undefined) {
        init = {
          method: input.method,
          headers: input.headers,
          // Request.body is a ReadableStream, ensure it's handled correctly or passed as is.
          // For simplicity, if the generated client passes a Request object, it should also pass 'init'.
          // If body is needed and not in init, it might require more complex handling.
          // body: input.body, // This might be problematic if stream already read.
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          integrity: input.integrity,
          keepalive: input.keepalive,
          mode: input.mode,
          referrer: input.referrer,
          referrerPolicy: input.referrerPolicy,
          signal: input.signal,
        };
      }
    }

    // Helper to call the underlying fetcher, preserving 'this' context for baseConfigForFetcher.fetchApi
    const callUnderlyingFetcher = async (url: string, fetchInit?: RequestInit) => {
      if (baseConfigForFetcher.fetchApi && typeof baseConfigForFetcher.fetchApi === 'function') {
        return baseConfigForFetcher.fetchApi(url, fetchInit);
      }
      return fetch(url, fetchInit); // Fallback to global fetch
    };

    try {
      // The dynamicAccessTokenProvider is part of the Configuration, so the OpenAPI client runtime
      // should have already used it to set the Authorization header in 'init' before calling this fetchApi.
      const response = await callUnderlyingFetcher(absoluteInputUrl, init);

      if (response.status === 401) {
        const currentSession = request.__apiClientSession;
        if (!currentSession) {
          // Should not happen if session was validated at the start of createApiClientWithAuth
          throw new Error('Session disappeared from request during 401 handling.');
        }
        const currentRefreshToken = currentSession.get('refreshToken') as string | undefined;

        if (!currentRefreshToken) {
          // No refresh token available on the session
          throw redirect('/login');
        }

        const newAuthResponse = await refreshAccessToken(currentRefreshToken);

        if (!newAuthResponse) {
          // Refresh failed
          throw redirect('/login');
        }

        // Update the request-scoped session with new tokens and user data
        currentSession.set('accessToken', newAuthResponse.token);
        currentSession.set('refreshToken', newAuthResponse.refreshToken);
        currentSession.set('userId', newAuthResponse.user.id); // Store userId

        // Prepare for retry: update Authorization header in a copy of original 'init'
        const newHeaders = new Headers(init?.headers);
        newHeaders.set('Authorization', `Bearer ${newAuthResponse.token}`);
        const retryInit = { ...init, headers: newHeaders };

        // Retry the request with the new token. The updated session on `request.__apiClientSession`
        // will be committed by the `withSessionHandling` HOF at the end of the loader/action.
        return callUnderlyingFetcher(absoluteInputUrl, retryInit);
      }
      return response;
    } catch (error) {
      if (error instanceof Response) {
        // Re-throw redirect responses or other Response errors
        throw error;
      }
      // Log other errors and re-throw
      logger.error('API request failed in customFetch:', error);
      throw error;
    }
  };

  // finalConfig will have customFetch as its fetchApi.
  // 'this' in customFetch will refer to this finalConfig instance when called by API client methods.
  const finalConfig = new Configuration({
    basePath: API_BASE_URL,
    accessToken: dynamicAccessTokenProvider,
    fetchApi: customFetch, // Assigning the function here
  });

  return { config: finalConfig };
}
