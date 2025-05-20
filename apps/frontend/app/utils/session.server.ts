import type { AuthResponseDto, SessionUserDto } from '@analytodon/rest-client';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { createAuthApi } from '~/services/api.server';

// Define the session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'analytodon_session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'default-secret-change-me'],
    secure: process.env.NODE_ENV === 'production',
  },
});

// Session data structure
interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: SessionUserDto;
  activeAccountId?: string;
}

/**
 * Create a new session with auth data
 */
export async function createUserSession(authResponse: AuthResponseDto, redirectTo: string): Promise<Response> {
  const session = await sessionStorage.getSession();

  // Store auth data in the session
  session.set('accessToken', authResponse.token);
  session.set('refreshToken', authResponse.refreshToken);
  session.set('user', authResponse.user);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

/**
 * Get the user session from the request
 */
export async function getUserSession(request: Request): Promise<SessionData | null> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));

  const accessToken = session.get('accessToken') as string | undefined;
  const refreshToken = session.get('refreshToken') as string | undefined;
  const user = session.get('user') as SessionUserDto | undefined;
  const activeAccountId = session.get('activeAccountId') as string | undefined;

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return { accessToken, refreshToken, user, activeAccountId };
}

/**
 * Get the current user from the session
 */
export async function getUser(request: Request): Promise<SessionUserDto | null> {
  const sessionData = await getUserSession(request);
  if (!sessionData) {
    return null;
  }

  return sessionData.user;
}

/**
 * Require a user to be logged in
 * If not, redirect to login page
 */
export async function requireUser(request: Request, redirectTo: string = '/login'): Promise<SessionUserDto> {
  const user = await getUser(request);

  if (!user) {
    throw redirect(redirectTo);
  }

  const url = new URL(request.url);
  const currentPath = url.pathname;

  if (!user.emailVerified) {
    if (currentPath !== '/register/verify') {
      throw redirect('/register/verify');
    }
  } else if (user.accounts.length === 0) {
    if (currentPath !== '/accounts/connect' && currentPath !== '/accounts/connect/callback') {
      throw redirect('/accounts/connect');
    }
  }

  return user;
}

/**
 * Log out a user by destroying their session
 */
export async function logout(request: Request, redirectTo: string = '/login'): Promise<Response> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}

/**
 * Refresh the access token using the refresh token
 * Returns the new auth response or null if refresh failed
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResponseDto | null> {
  try {
    const authApi = createAuthApi();
    const response = await authApi.authControllerRefreshTokens({
      refreshTokenDto: { refreshToken },
    });

    return response;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

// Type for the original loader/action function that will be wrapped
type OriginalLoaderOrAction = (
  args: LoaderFunctionArgs | ActionFunctionArgs,
  // Optionally, the HOF could pass the session instance directly to the loader/action
  // session: Session
) => Promise<Response | unknown>;

/**
 * Higher-Order Function to wrap Remix loaders and actions for session handling.
 * It retrieves the session, makes it available as `request.__apiClientSession`,
 * executes the loader/action, and then commits the session, adding any
 * `Set-Cookie` header to the response.
 */
export function withSessionHandling(originalLoaderOrAction: OriginalLoaderOrAction) {
  return async (args: LoaderFunctionArgs | ActionFunctionArgs): Promise<Response> => {
    const session = await sessionStorage.getSession(args.request.headers.get('Cookie'));
    args.request.__apiClientSession = session; // Make session available on the request object

    let resultOrResponse: Response | unknown;
    let errorOccurred: Error | undefined;
    let thrownResponse: Response | undefined;

    try {
      resultOrResponse = await originalLoaderOrAction(args);
    } catch (e) {
      if (e instanceof Response) {
        // If the loader/action threw a Response (e.g., redirect), capture it.
        thrownResponse = e;
        resultOrResponse = e; // Ensure resultOrResponse is assigned
      } else if (e instanceof Error) {
        errorOccurred = e;
        resultOrResponse = undefined; // Ensure resultOrResponse is assigned
      } else {
        // Unknown error type
        errorOccurred = new Error('An unknown error occurred');
        resultOrResponse = undefined; // Ensure resultOrResponse is assigned
      }
    }

    // Always try to commit the session, even if an error occurred or a Response was thrown,
    // as a token refresh might have happened before the error/throw.
    const sessionToCommit = args.request.__apiClientSession || session; // Fallback to initially fetched session
    const cookie = await sessionStorage.commitSession(sessionToCommit);
    const responseHeaders = new Headers();
    if (cookie) {
      responseHeaders.set('Set-Cookie', cookie);
    }

    if (thrownResponse) {
      // If the loader/action threw a Response (e.g. redirect),
      // create a new Response to carry over its status and existing headers,
      // plus our Set-Cookie header.
      const newHeaders = new Headers(thrownResponse.headers);
      if (cookie) {
        newHeaders.append('Set-Cookie', cookie); // Append to allow multiple Set-Cookie headers
      }
      // Read the body if it exists and is not null, to forward it.
      // For redirects, body is often null.
      const body = thrownResponse.body ? await thrownResponse.arrayBuffer() : null;
      return new Response(body, {
        status: thrownResponse.status,
        statusText: thrownResponse.statusText,
        headers: newHeaders,
      });
    }

    if (errorOccurred) {
      // If an error was caught, re-throw it. The session commit attempt was made.
      // Consider if a generic error response with the cookie should be returned instead.
      // For now, re-throwing preserves original error handling.
      console.error('Error in wrapped loader/action, session commit attempted:', errorOccurred);
      throw errorOccurred;
    }

    if (resultOrResponse instanceof Response) {
      // If the loader/action returned a Response, merge Set-Cookie.
      const newHeaders = new Headers(resultOrResponse.headers);
      if (cookie) {
        newHeaders.append('Set-Cookie', cookie);
      }
      const body = resultOrResponse.body ? await resultOrResponse.arrayBuffer() : null;
      return new Response(body, {
        status: resultOrResponse.status,
        statusText: resultOrResponse.statusText,
        headers: newHeaders,
      });
    }

    // If the loader/action returned data, create a JSON response with it.
    // responseHeaders already contains the Set-Cookie if needed.
    const body = JSON.stringify(resultOrResponse);
    responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(body, {
      status: 200, // Default status for successful data responses
      headers: responseHeaders,
    });
  };
}
