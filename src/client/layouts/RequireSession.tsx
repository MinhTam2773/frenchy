import { Navigate, Outlet } from 'react-router';
import { useActiveMinutes } from '@client/lib/activity';
import { useSession } from '@client/lib/session';

/**
 * Sends signed-out users to the welcome screen; wraps every route that needs an account.
 * Every signed-in screen counts toward today's minutes (G-38), so the ping lives here.
 */
export function RequireSession() {
  const { status } = useSession();
  useActiveMinutes(status === 'signed-in');
  if (status === 'loading') return null;
  if (status === 'signed-out') return <Navigate to="/" replace />;
  return <Outlet />;
}
