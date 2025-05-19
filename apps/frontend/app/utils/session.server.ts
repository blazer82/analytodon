import { AuthResponseDto, SessionUserDto } from '@analytodon/rest-client';
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

  const accessToken = session.get('accessToken');
  const refreshToken = session.get('refreshToken');
  const user = session.get('user');

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return { accessToken, refreshToken, user };
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

/**
 * Handle API response and update session if tokens were refreshed
 */
export async function handleApiResponse<T>(request: Request, response: T): Promise<T> {
  // Check if the request has a new session cookie from token refresh
  const newSessionCookie = (request as { __newSessionCookie?: string }).__newSessionCookie;
  if (newSessionCookie) {
    // If we have a new session cookie, we need to add it to the response headers
    const headers = new Headers();
    headers.set('Set-Cookie', newSessionCookie);

    // Throw a response that will be caught by the loader/action
    throw new Response(null, {
      status: 200,
      headers,
    });
  }

  return response;
}
