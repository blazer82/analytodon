import type { LoaderFunctionArgs } from '@remix-run/node';
import { createFollowersApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { resolveEffectiveAccountId } from '~/utils/active-account.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!;
  const accountId = resolveEffectiveAccountId(request, user, session);

  if (!accountId) {
    return new Response('Account not found or not active.', { status: 404 });
  }

  const url = new URL(request.url);
  const timeframe = url.searchParams.get('timeframe') || 'last30days'; // Default timeframe

  try {
    const followersApi = await createFollowersApiWithAuth(request);
    const apiResponse = await followersApi.followersControllerExportCsvRaw({
      accountId,
      timeframe,
    });

    // Forward the response from the API
    // The `followersControllerExportCsvRaw` returns a `runtime.ApiResponse<void>`
    // The actual CSV data is in `apiResponse.raw.blob()`
    // We need to construct a new Response with the CSV data and appropriate headers.

    const blob = await apiResponse.raw.blob();
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="followers_export_${accountId}_${timeframe}.csv"`);

    return new Response(blob, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    logger.error('Failed to export CSV:', error, { accountId, timeframe });
    return new Response('Failed to export CSV data.', { status: 500 });
  }
});
