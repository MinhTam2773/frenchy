import { Navigate, Outlet } from 'react-router';
import { useSession } from '@client/lib/session';

/** Sends signed-out users to the welcome screen; wraps every route that needs an account. */
export function RequireSession() {
  const { status } = useSession();
  if (status === 'loading') return null;
  if (status === 'signed-out') return <Navigate to="/" replace />;
  return <Outlet />;
}
