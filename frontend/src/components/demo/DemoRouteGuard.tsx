import { useProfile } from '@/hooks/useProfile';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Keeps the seeded demo identities inside the demo sandbox.
 *
 * They are real Django users, but they only belong to the "Pass It On Demo"
 * group, which carries no model permissions: the regular app's screens either
 * answer with a 403 (creating items) or render empty lists (my items, bookings,
 * collections). Bouncing them back to `/demo/browse` is clearer than letting
 * them walk into a broken screen.
 */
export const DemoRouteGuard = ({ children }: { children: ReactNode }) => {
  const { data: profile, isLoading } = useProfile();

  // Wait for the profile before deciding; rendering `children` first would let
  // the guarded page fire its requests and show the very error we avoid.
  if (isLoading) return null;
  if (profile?.is_demo) return <Navigate to="/demo/browse" replace />;

  return <>{children}</>;
};

export default DemoRouteGuard;
