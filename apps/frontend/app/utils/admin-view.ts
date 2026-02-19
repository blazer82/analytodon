import { useCallback } from 'react';

import { useSearchParams } from '@remix-run/react';

/**
 * Client-side hook for admin "View As" mode.
 *
 * Reads the `viewAs` query parameter from the URL and provides
 * a helper to build links that preserve the viewAs context.
 */
export function useAdminViewAs() {
  const [searchParams] = useSearchParams();
  const viewAsAccountId = searchParams.get('viewAs');

  const buildLink = useCallback(
    (path: string) => {
      if (!viewAsAccountId) return path;
      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}viewAs=${viewAsAccountId}`;
    },
    [viewAsAccountId],
  );

  return {
    isAdminView: !!viewAsAccountId,
    viewAsAccountId,
    buildLink,
  };
}
