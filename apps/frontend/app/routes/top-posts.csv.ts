import type { LoaderFunctionArgs } from '@remix-run/node';
import { createTootsApiWithAuth } from '~/services/api.server';
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
  const dateFrom = url.searchParams.get('dateFrom') || undefined;
  const dateTo = url.searchParams.get('dateTo') || undefined;

  if (!timeframe) {
    return new Response('Timeframe parameter is required', { status: 400 });
  }

  try {
    const tootsApi = await createTootsApiWithAuth(request);
    const apiResponse = await tootsApi.tootsControllerExportCsvRaw({
      accountId,
      timeframe,
      dateFrom,
      dateTo,
    });

    const csvData = await apiResponse.raw.text();
    const headers = new Headers(apiResponse.raw.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/csv');
    }
    if (!headers.has('Content-Disposition')) {
      headers.set('Content-Disposition', `attachment; filename="top-posts-${accountId}-${timeframe}.csv"`);
    }

    return new Response(csvData, {
      status: apiResponse.raw.status,
      headers,
    });
  } catch (error) {
    logger.error('Failed to export top posts CSV:', error);
    if (error instanceof Response) {
      throw error;
    }
    return new Response('Failed to export CSV data.', { status: 500 });
  }
});
