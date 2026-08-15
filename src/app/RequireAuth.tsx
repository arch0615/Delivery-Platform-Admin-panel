import { Navigate, Outlet, useLocation } from 'react-router'

import { useSession } from '@/app/session-context'

/**
 * Gate in front of every admin screen.
 *
 * A half-finished sign-in counts as signed out: `awaiting_code` and
 * `enrolling` are redirected to their own step rather than let through, so
 * two-factor cannot be skipped by navigating straight to a URL.
 *
 * A UI guard only - the server rejects unauthenticated requests regardless.
 */
export function RequireAuth() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'awaiting_code') {
    return <Navigate to="/login/2fa" replace />
  }

  if (status === 'enrolling') {
    return <Navigate to="/login/enroll" replace />
  }

  if (status !== 'signed_in') {
    // Remember where they were headed so sign-in can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
