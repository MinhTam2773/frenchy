import { Navigate } from 'react-router';
import { useProfile } from '@client/lib/query';

/** Where a signed-in user belongs: onboarding until a chapter is chosen, then Today. */
export function SignedInRedirect() {
  const profile = useProfile();
  if (profile.isPending) return null;
  // A profile that won't load still lets the user in; the screens show their own error.
  return (
    <Navigate to={profile.data?.currentChapterId === null ? '/onboarding' : '/today'} replace />
  );
}
