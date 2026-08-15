import { createContext, use } from 'react'

import type { Market } from '@/lib/markets'
import type { Permission, Role, RoleCode } from '@/lib/permissions'

export const SESSION_ROLE_KEY = 'admin.session.role'
export const SESSION_MARKET_KEY = 'admin.session.market'

export type AdminUser = {
  id: string
  name: string
  email: string
  roleCode: RoleCode
}

export type SessionContextValue = {
  user: AdminUser
  role: Role
  permissions: readonly Permission[]

  /** UI-level permission check. The server re-checks on every request. */
  can: (permission: Permission) => boolean
  canAny: (permissions: readonly Permission[]) => boolean

  /** Markets this admin may act in. A single entry hides the selector. */
  markets: readonly Market[]
  market: Market
  setMarketId: (marketId: string) => void

  /**
   * TEMPORARY. Lets the role be switched from the UI so permission filtering
   * is reviewable before GET /admin/me exists. Remove when auth lands (A-001).
   */
  setRoleCode: (roleCode: RoleCode) => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const value = use(SessionContext)

  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider')
  }

  return value
}
