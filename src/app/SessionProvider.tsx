import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  SESSION_MARKET_KEY,
  SessionContext,
  type AdminUser,
  type AuthStatus,
  type EnrollmentDraft,
  type PendingSignIn,
} from '@/app/session-context'
import {
  beginEnrollment,
  clearSession,
  confirmEnrollment,
  findAccount,
  login as mockLogin,
  readSession,
  verifyCode as mockVerifyCode,
  verifyRecoveryCode as mockVerifyRecoveryCode,
  writeSession,
  type CodeResult,
  type LoginResult,
} from '@/lib/auth/mock-auth'
import { verifyTotp } from '@/lib/auth/totp'
import { MARKETS, findMarket, type Market } from '@/lib/markets'
import { ROLES, hasAnyPermission, hasPermission } from '@/lib/permissions'

/*
 * Session state.
 *
 * Auth calls go through src/lib/auth/mock-auth.ts, which stands in for the
 * real endpoints. When they exist, this provider changes only in that those
 * functions become fetches - the state machine here is unchanged.
 */

const NO_PERMISSIONS: readonly string[] = []

function accountToUser(email: string): AdminUser | null {
  const account = findAccount(email)
  if (!account) {
    return null
  }

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    roleCode: account.roleCode,
  }
}

function readInitialUser(): AdminUser | null {
  const session = readSession()
  return session ? accountToUser(session.email) : null
}

function readStoredMarket(): Market {
  const stored = localStorage.getItem(SESSION_MARKET_KEY)
  const market = stored === null ? undefined : findMarket(stored)
  // MARKETS is a non-empty constant, so index 0 always exists.
  return market ?? (MARKETS[0] as Market)
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(readInitialUser)
  const [status, setStatus] = useState<AuthStatus>(() =>
    readInitialUser() ? 'signed_in' : 'signed_out',
  )
  const [pending, setPending] = useState<PendingSignIn | null>(null)
  const [enrollmentDraft, setEnrollmentDraft] = useState<EnrollmentDraft | null>(null)
  const [market, setMarketState] = useState<Market>(readStoredMarket)

  const setMarketId = useCallback((marketId: string) => {
    const next = findMarket(marketId)
    if (!next) {
      return
    }
    localStorage.setItem(SESSION_MARKET_KEY, marketId)
    setMarketState(next)
  }, [])

  const signIn = useCallback((email: string, password: string): LoginResult => {
    const result = mockLogin(email, password)

    if (result.status === 'needs_code') {
      setPending(result.challenge)
      setEnrollmentDraft(null)
      setStatus('awaiting_code')
    } else if (result.status === 'needs_enrollment') {
      setPending(result.challenge)
      setEnrollmentDraft(beginEnrollment())
      setStatus('enrolling')
    }

    return result
  }, [])

  const completeSignIn = useCallback((email: string) => {
    writeSession(email)
    setUser(accountToUser(email))
    setPending(null)
    setEnrollmentDraft(null)
    setStatus('signed_in')
  }, [])

  const submitCode = useCallback(
    async (code: string): Promise<CodeResult> => {
      if (!pending) {
        return { status: 'invalid', attemptsRemaining: 0 }
      }

      const result = await mockVerifyCode(pending.email, code)
      if (result.status === 'ok') {
        completeSignIn(pending.email)
      }

      return result
    },
    [pending, completeSignIn],
  )

  const submitRecoveryCode = useCallback(
    (code: string): CodeResult => {
      if (!pending) {
        return { status: 'invalid', attemptsRemaining: 0 }
      }

      const result = mockVerifyRecoveryCode(pending.email, code)
      if (result.status === 'ok') {
        completeSignIn(pending.email)
      }

      return result
    },
    [pending, completeSignIn],
  )

  /**
   * Finish enrolment. The secret is only persisted once the user proves they
   * can generate a code from it - otherwise a mis-scanned QR would lock them
   * out of their own account on the next sign-in.
   */
  const confirmEnrollmentCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!pending || !enrollmentDraft) {
        return false
      }

      const valid = await verifyTotp(enrollmentDraft.secret, code, { window: 1 })
      if (!valid) {
        return false
      }

      confirmEnrollment(pending.email, enrollmentDraft.secret, enrollmentDraft.recoveryCodes)
      completeSignIn(pending.email)
      return true
    },
    [pending, enrollmentDraft, completeSignIn],
  )

  const cancelSignIn = useCallback(() => {
    setPending(null)
    setEnrollmentDraft(null)
    setStatus('signed_out')
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
    setPending(null)
    setEnrollmentDraft(null)
    setStatus('signed_out')
  }, [])

  const value = useMemo(() => {
    const role = user ? ROLES[user.roleCode] : null
    const permissions = role ? role.permissions : NO_PERMISSIONS

    return {
      status,
      user,
      role,
      permissions,
      can: (permission: string) => hasPermission(permissions, permission),
      canAny: (required: readonly string[]) => hasAnyPermission(permissions, required),
      markets: MARKETS,
      market,
      setMarketId,
      pending,
      enrollmentDraft,
      signIn,
      submitCode,
      submitRecoveryCode,
      confirmEnrollmentCode,
      cancelSignIn,
      signOut,
    }
  }, [
    status,
    user,
    market,
    setMarketId,
    pending,
    enrollmentDraft,
    signIn,
    submitCode,
    submitRecoveryCode,
    confirmEnrollmentCode,
    cancelSignIn,
    signOut,
  ])

  return <SessionContext value={value}>{children}</SessionContext>
}
