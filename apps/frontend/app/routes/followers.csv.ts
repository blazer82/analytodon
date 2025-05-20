import type { LoaderFunctionArgs } from '@remix-run/node';
import { createFollowersApiWithAuth } from '~/services/api.server';
import { requireUser, sessionStorage } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const activeAccountId = session.get('activeAccountId') as string | undefined;

  const currentAccount = activeAccountId
    ? user.accounts.find((acc) => acc.id === activeAccountId)
    : user.accounts.length > 0
      ? user.accounts[0]
      : null;

  if (!currentAccount || !currentAccount.id) {
    return new Response('Account not found or not active.', { status: 404 });
  }
  const accountId = currentAccount.id;

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
    console.error('Failed to export CSV:', error);
    return new Response('Failed to export CSV data.', { status: 500 });
  }
}
