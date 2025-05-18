import { AuthResponseDto, SessionUserDto } from '@analytodon/rest-client';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { createAuthApi } from '~/services/api.server';

// Define the session storage
const sessionStorage = createCookieSessionStorage({
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
