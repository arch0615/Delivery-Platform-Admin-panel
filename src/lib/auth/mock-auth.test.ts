import { beforeEach, describe, expect, it } from 'vitest'

import {
  ACCOUNTS,
  DEMO_PASSWORD,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  beginEnrollment,
  clearLockout,
  confirmEnrollment,
  isEnrolled,
  lockedUntil,
  login,
  remainingRecoveryCodes,
  verifyCode,
  verifyRecoveryCode,
} from '@/lib/auth/mock-auth'
import { generateTotp } from '@/lib/auth/totp'

/** Minimal localStorage so the module under test can run outside a browser. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

const ADMIN = ACCOUNTS[0]!
const NOW = 1_700_000_000_000

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

describe('login', () => {
  it('requires enrolment on a first sign-in', () => {
    const result = login(ADMIN.email, DEMO_PASSWORD, NOW)
    expect(result.status).toBe('needs_enrollment')
  })

  it('requires a code once enrolled', () => {
    const { secret, recoveryCodes } = beginEnrollment()
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)

    const result = login(ADMIN.email, DEMO_PASSWORD, NOW)
    expect(result.status).toBe('needs_code')
  })

  it('never returns a session directly - 2FA is mandatory', () => {
    const statuses = new Set<string>()
    const { secret, recoveryCodes } = beginEnrollment()

    statuses.add(login(ADMIN.email, DEMO_PASSWORD, NOW).status)
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)
    statuses.add(login(ADMIN.email, DEMO_PASSWORD, NOW).status)

    expect(statuses).toEqual(new Set(['needs_enrollment', 'needs_code']))
  })

  it('is case and whitespace insensitive on the email', () => {
    const result = login(`  ${ADMIN.email.toUpperCase()}  `, DEMO_PASSWORD, NOW)
    expect(result.status).toBe('needs_enrollment')
  })

  it('reports a wrong password with the attempts remaining', () => {
    const result = login(ADMIN.email, 'wrong', NOW)

    expect(result).toEqual({
      status: 'invalid_credentials',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - 1,
    })
  })

  it('does not let an unknown email be distinguished from a wrong password', () => {
    const unknown = login('nobody@plataforma.mx', 'whatever', NOW)
    const wrongPassword = login(ADMIN.email, 'wrong', NOW)

    expect(unknown).toEqual(wrongPassword)
  })
})

describe('lockout', () => {
  it('locks the account after five failed attempts', () => {
    // Acceptance criterion for A-001.
    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      expect(login(ADMIN.email, 'wrong', NOW).status).toBe('invalid_credentials')
    }

    const result = login(ADMIN.email, 'wrong', NOW)
    expect(result).toEqual({ status: 'locked', unlockAt: NOW + LOCKOUT_DURATION_MS })
  })

  it('rejects the correct password while locked', () => {
    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      login(ADMIN.email, 'wrong', NOW)
    }

    const result = login(ADMIN.email, DEMO_PASSWORD, NOW + 60_000)
    expect(result.status).toBe('locked')
  })

  it('lets the account back in once the lockout expires', () => {
    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      login(ADMIN.email, 'wrong', NOW)
    }

    const later = NOW + LOCKOUT_DURATION_MS + 1
    expect(lockedUntil(ADMIN.email, later)).toBeNull()
    expect(login(ADMIN.email, DEMO_PASSWORD, later).status).toBe('needs_enrollment')
  })

  it('resets the counter after a successful sign-in', () => {
    login(ADMIN.email, 'wrong', NOW)
    login(ADMIN.email, 'wrong', NOW)
    login(ADMIN.email, DEMO_PASSWORD, NOW)

    // The counter restarts, so a fresh failure reports the full allowance.
    expect(login(ADMIN.email, 'wrong', NOW)).toEqual({
      status: 'invalid_credentials',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - 1,
    })
  })

  it('tracks lockouts per account', () => {
    const other = ACCOUNTS[1]!

    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      login(ADMIN.email, 'wrong', NOW)
    }

    expect(lockedUntil(ADMIN.email, NOW)).not.toBeNull()
    expect(lockedUntil(other.email, NOW)).toBeNull()
  })
})

describe('verifyCode', () => {
  it('accepts a code generated from the enrolled secret', async () => {
    const { secret, recoveryCodes } = beginEnrollment()
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)

    const code = await generateTotp(secret, { timestampMs: NOW })
    await expect(verifyCode(ADMIN.email, code, NOW)).resolves.toEqual({ status: 'ok' })
  })

  it('rejects a wrong code and counts it toward the lockout', async () => {
    const { secret, recoveryCodes } = beginEnrollment()
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)

    const result = await verifyCode(ADMIN.email, '000000', NOW)
    expect(result).toEqual({ status: 'invalid', attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 })
  })

  it('locks after repeated wrong codes', async () => {
    const { secret, recoveryCodes } = beginEnrollment()
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)

    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      await verifyCode(ADMIN.email, '000000', NOW)
    }

    const result = await verifyCode(ADMIN.email, '000000', NOW)
    expect(result.status).toBe('locked')
  })
})

describe('recovery codes', () => {
  it('accepts a recovery code once and then burns it', () => {
    const { secret, recoveryCodes } = beginEnrollment()
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)

    const code = recoveryCodes[0]!
    expect(remainingRecoveryCodes(ADMIN.email)).toBe(recoveryCodes.length)

    expect(verifyRecoveryCode(ADMIN.email, code, NOW)).toEqual({ status: 'ok' })
    expect(remainingRecoveryCodes(ADMIN.email)).toBe(recoveryCodes.length - 1)

    // Reusing it must fail.
    clearLockout(ADMIN.email)
    expect(verifyRecoveryCode(ADMIN.email, code, NOW).status).toBe('invalid')
  })

  it('is case insensitive and tolerates surrounding whitespace', () => {
    const { secret, recoveryCodes } = beginEnrollment()
    confirmEnrollment(ADMIN.email, secret, recoveryCodes)

    const code = recoveryCodes[0]!
    expect(verifyRecoveryCode(ADMIN.email, `  ${code.toLowerCase()} `, NOW).status).toBe('ok')
  })
})

describe('enrollment', () => {
  it('persists nothing until confirmed', () => {
    beginEnrollment()
    expect(isEnrolled(ADMIN.email)).toBe(false)
  })

  it('issues eight single-use recovery codes', () => {
    const { recoveryCodes } = beginEnrollment()

    expect(recoveryCodes).toHaveLength(8)
    expect(new Set(recoveryCodes).size).toBe(8)
    for (const code of recoveryCodes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/)
    }
  })
})
