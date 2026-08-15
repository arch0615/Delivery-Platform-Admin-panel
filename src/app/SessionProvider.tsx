import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  SESSION_MARKET_KEY,
  SESSION_ROLE_KEY,
  SessionContext,
  type AdminUser,
} from '@/app/session-context'
import { MARKETS, findMarket, type Market } from '@/lib/markets'
import { ROLES, hasAnyPermission, hasPermission, type RoleCode } from '@/lib/permissions'

/*
 * Stands in for GET /admin/me until the API exists (A-003 dependency).
 * The value shape is the real one, so swapping in the fetch is a local change.
 *
 * NOTE: the market is persisted to localStorage here. Once the resource
 * framework (A-005) introduces URL-driven state, the selected market moves
 * into the URL as well so admin views stay shareable.
 */

const SEED_USER: Omit<AdminUser, 'roleCode'> = {
  id: '9a3f1e2b-0000-4000-8000-000000000001',
  name: 'Alex Ramírez',
  email: 'alex.ramirez@plataforma.mx',
}

function readStoredRole(): RoleCode {
  const stored = localStorage.getItem(SESSION_ROLE_KEY)
  return stored !== null && stored in ROLES ? (stored as RoleCode) : 'super_admin'
}

function readStoredMarket(): Market {
  const stored = localStorage.getItem(SESSION_MARKET_KEY)
  const market = stored === null ? undefined : findMarket(stored)
  // MARKETS is a non-empty constant, so index 0 always exists.
  return market ?? (MARKETS[0] as Market)
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [roleCode, setRoleCodeState] = useState<RoleCode>(readStoredRole)
  const [market, setMarketState] = useState<Market>(readStoredMarket)

  const setRoleCode = useCallback((next: RoleCode) => {
    localStorage.setItem(SESSION_ROLE_KEY, next)
    setRoleCodeState(next)
  }, [])

  const setMarketId = useCallback((marketId: string) => {
    const next = findMarket(marketId)
    if (!next) {
      return
    }
    localStorage.setItem(SESSION_MARKET_KEY, marketId)
    setMarketState(next)
  }, [])

  const value = useMemo(() => {
    const role = ROLES[roleCode]
    const permissions = role.permissions

    return {
      user: { ...SEED_USER, roleCode },
      role,
      permissions,
      can: (permission: string) => hasPermission(permissions, permission),
      canAny: (required: readonly string[]) => hasAnyPermission(permissions, required),
      markets: MARKETS,
      market,
      setMarketId,
      setRoleCode,
    }
  }, [roleCode, market, setMarketId, setRoleCode])

  return <SessionContext value={value}>{children}</SessionContext>
}
