import { redirect, type ActionFunctionArgs } from '@remix-run/node';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const action = withSessionHandling(async ({ request }: ActionFunctionArgs) => {
  await requireUser(request);
  const formData = await request.formData();
  const accountId = formData.get('accountId') as string;

  const referrer = request.headers.get('Referer') || '/dashboard';

  if (!accountId) {
    logger.error('Account ID missing in switch account request');
    // Redirect back to where the user came from, possibly with an error indicator if UI supports it.
    // For now, just redirecting to referrer.
    throw redirect(referrer);
  }

  const session = request.__apiClientSession!; // Guaranteed by withSessionHandling
  session.set('activeAccountId', accountId);

  // On successful switch, redirect back to the referrer.
  // The withSessionHandling HOF will commit the session and handle the redirect.
  throw redirect(referrer);
});
