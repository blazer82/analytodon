import { UsersControllerGetEmailRecipientCountRecipientGroupEnum } from '@analytodon/rest-client';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { createUsersApiWithAuth } from '~/services/api.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  const url = new URL(request.url);
  const recipientGroup = url.searchParams.get('recipientGroup') || 'all';

  const usersApi = await createUsersApiWithAuth(request);
  const result = await usersApi.usersControllerGetEmailRecipientCount({
    recipientGroup: recipientGroup as UsersControllerGetEmailRecipientCountRecipientGroupEnum,
  });
  return json({ count: result.count });
});
