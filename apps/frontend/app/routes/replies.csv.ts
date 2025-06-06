import type { LoaderFunctionArgs } from '@remix-run/node';
import { createRepliesApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!; // Session is guaranteed by withSessionHandling
  const activeAccountId = session.get('activeAccountId') as string | undefined;

  const currentAccount = activeAccountId
    ? user.accounts.find((acc) => acc.id === activeAccountId)
    : user.accounts.length > 0
      ? user.accounts[0]
      : null;

  if (!currentAccount || !currentAccount.id) {
    return new Response('Account not found or not selected', { status: 404 });
  }
  const accountId = currentAccount.id;

  const url = new URL(request.url);
  const timeframe = url.searchParams.get('timeframe');

  if (!timeframe) {
    return new Response('Timeframe parameter is required', { status: 400 });
  }

  try {
    const repliesApi = await createRepliesApiWithAuth(request);
    // The repliesControllerExportCsvRaw is expected to return the raw response containing the CSV data.
    const apiResponse = await repliesApi.repliesControllerExportCsvRaw({
      accountId,
      timeframe,
    });

    // Assuming the API returns the CSV data directly in the response body
    const csvData = await apiResponse.raw.text();
    const headers = new Headers(apiResponse.raw.headers);

    // Ensure correct headers for CSV download if not already set by API
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/csv');
    }
    if (!headers.has('Content-Disposition')) {
      headers.set('Content-Disposition', `attachment; filename="replies-${accountId}-${timeframe}.csv"`);
    }

    return new Response(csvData, {
      status: apiResponse.raw.status,
      headers: headers,
    });
  } catch (error) {
    logger.error('Failed to export replies CSV:', error);
    // Check if error is a Response object (e.g., from API client redirect/error handling)
    if (error instanceof Response) {
      throw error;
    }
    return new Response('Failed to export CSV data.', { status: 500 });
  }
});
