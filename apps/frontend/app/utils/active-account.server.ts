import type { SessionUserDto } from '@analytodon/rest-client';

/**
 * Resolves the effective account ID for analytics loaders.
 *
 * If the user is an admin and the URL contains a `viewAs` query parameter,
 * that ID is used (admin view mode). Otherwise, uses the session's
 * activeAccountId or defaults to the user's first account.
 */
export function resolveEffectiveAccountId(
  request: Request,
  user: SessionUserDto,
  session: { get(key: string): unknown },
): string | null {
  // Admin viewAs override
  if (user.role === 'admin') {
    const url = new URL(request.url);
    const viewAs = url.searchParams.get('viewAs');
    if (viewAs) {
      return viewAs;
    }
  }

  // Standard account resolution
  const activeAccountId = session.get('activeAccountId') as string | undefined;
  const currentAccount = activeAccountId
    ? user.accounts.find((acc) => acc.id === activeAccountId)
    : user.accounts.length > 0
      ? user.accounts[0]
      : null;

  return currentAccount?.id ?? null;
}
