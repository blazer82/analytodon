import { createCookie, redirect, type ActionFunctionArgs } from '@remix-run/node';

const languageCookie = createCookie('i18next', {
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const language = formData.get('language') as string;
  const referer = request.headers.get('Referer') || '/';

  // Set language cookie
  return redirect(referer, {
    headers: {
      'Set-Cookie': await languageCookie.serialize(language),
    },
  });
}
