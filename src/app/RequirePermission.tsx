import type { ReactNode } from 'react'

import { useSession } from '@/app/session-context'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

export type RequirePermissionProps = {
  permission: string
  children: ReactNode
}

/**
 * Route-level permission gate.
 *
 * The sidebar already hides routes the viewer cannot reach; this catches the
 * ways they arrive anyway - a bookmark, a pasted link, a role changed while
 * the tab was open. Still only a UI guard: the server rejects the request
 * regardless of what renders here.
 */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { can } = useSession()

  if (!can(permission)) {
    return <ForbiddenPage permission={permission} />
  }

  return children
}
