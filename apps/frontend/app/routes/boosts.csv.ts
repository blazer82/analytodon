import type { LoaderFunctionArgs } from '@remix-run/node';
import { createBoostsApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { resolveEffectiveAccountId } from '~/utils/active-account.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const session = request.__apiClientSession!;
  const accountId = resolveEffectiveAccountId(request, user, session);

  if (!accountId) {
    return new Response('Account not found or not selected', { status: 404 });
  }

  const url = new URL(request.url);
  const timeframe = url.searchParams.get('timeframe');

  if (!timeframe) {
    return new Response('Timeframe parameter is required', { status: 400 });
  }

  try {
    const boostsApi = await createBoostsApiWithAuth(request);
    // The boostsControllerExportCsvRaw is expected to return the raw response containing the CSV data.
    // The OpenAPI generator might type the simplified boostsControllerExportCsv as Promise<void>
    // if the schema indicates a 204 or if it's not well-defined for file downloads.
    // We use the Raw method to get access to the Response object.
    const apiResponse = await boostsApi.boostsControllerExportCsvRaw({
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
      headers.set('Content-Disposition', `attachment; filename="boosts-${accountId}-${timeframe}.csv"`);
    }

    return new Response(csvData, {
      status: apiResponse.raw.status,
      headers: headers,
    });
  } catch (error) {
    logger.error('Failed to export boosts CSV:', error);
    // Check if error is a Response object (e.g., from API client redirect/error handling)
    if (error instanceof Response) {
      throw error;
    }
    return new Response('Failed to export CSV data.', { status: 500 });
  }
});
