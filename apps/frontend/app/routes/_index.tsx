import type { MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import ProtectedRoute from '~/components/ProtectedRoute';
import { useAuth } from '~/utils/auth.context';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }, { name: 'description', content: 'Analytodon Analytics Dashboard' }];
};

export async function loader() {
  // This will be replaced with actual auth check later
  // For now, redirect to login to demonstrate the flow
  return redirect('/login');
}

export default function Index() {
  const { user } = useAuth();

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
