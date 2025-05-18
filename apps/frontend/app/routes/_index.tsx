import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import ProtectedRoute from '~/components/ProtectedRoute';
import { requireUser } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }, { name: 'description', content: 'Analytodon Analytics Dashboard' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Require user to be logged in, redirects to login if not
  const user = await requireUser(request);

  return { user };
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <ProtectedRoute>
      <div>
        <h1>Welcome to Analytodon Dashboard</h1>
        <p>This is a protected route. You need to be logged in to see this.</p>
        {user && <p>Hello, {user.email}</p>}
      </div>
    </ProtectedRoute>
  );
}
