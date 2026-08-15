import { createContext, use } from 'react'

import type { CodeResult, LoginResult } from '@/lib/auth/mock-auth'
import type { Market } from '@/lib/markets'
import type { Permission, Role, RoleCode } from '@/lib/permissions'

export const SESSION_MARKET_KEY = 'admin.session.market'

export type AdminUser = {
  id: string
  name: string
  email: string
  roleCode: RoleCode
}

/**
 * Sign-in is a state machine, not a boolean. Two-factor is mandatory, so
 * `awaiting_code` and `enrolling` are real states that hold a half-finished
 * sign-in - neither grants access to any admin screen.
 */
export type AuthStatus = 'signed_out' | 'awaiting_code' | 'enrolling' | 'signed_in'

export type PendingSignIn = {
  email: string
  name: string
}

export type EnrollmentDraft = {
  secret: string
  recoveryCodes: string[]
}

export type SessionContextValue = {
  status: AuthStatus

  /** Non-null only when status is 'signed_in'. */
  user: AdminUser | null
  role: Role | null
  permissions: readonly Permission[]

  /** Deny-all while signed out. */
  can: (permission: Permission) => boolean
  canAny: (permissions: readonly Permission[]) => boolean

  markets: readonly Market[]
  market: Market
  setMarketId: (marketId: string) => void

  /** Set while a sign-in is half finished. */
  pending: PendingSignIn | null
  /** Secret and recovery codes offered during enrolment, before confirmation. */
  enrollmentDraft: EnrollmentDraft | null

  signIn: (email: string, password: string) => LoginResult
  submitCode: (code: string) => Promise<CodeResult>
  submitRecoveryCode: (code: string) => CodeResult
  confirmEnrollmentCode: (code: string) => Promise<boolean>
  cancelSignIn: () => void
  signOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const value = use(SessionContext)

  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider')
  }

  return value
}

export type AuthenticatedSession = Omit<SessionContextValue, 'user' | 'role'> & {
  user: AdminUser
  role: Role
}

/**
 * Narrowed session for screens behind RequireAuth, so they do not each have to
 * null-check a user that is guaranteed present.
 */
export function useCurrentUser(): AuthenticatedSession {
  const session = useSession()

  if (session.status !== 'signed_in' || !session.user || !session.role) {
    throw new Error('useCurrentUser must be used inside RequireAuth')
  }

  return { ...session, user: session.user, role: session.role }
}
