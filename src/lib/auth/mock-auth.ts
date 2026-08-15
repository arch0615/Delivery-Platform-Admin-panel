import { generateSecret, verifyTotp } from '@/lib/auth/totp'
import type { RoleCode } from '@/lib/permissions'

/*
 * MOCK AUTHENTICATION
 *
 * Stands in for the auth endpoints until the API exists:
 *   POST /admin/auth/login
 *   POST /admin/auth/2fa/verify
 *   POST /admin/auth/2fa/enroll
 *
 * The result shapes are the ones the real client will consume, so swapping in
 * fetch calls is a local change inside this module.
 *
 * NOT SECURITY. Passwords are compared in plaintext in the browser and the
 * TOTP secret is stored in localStorage. Both are impossible in production:
 * the server holds the secret, hashes the password with Argon2id, and enforces
 * lockout server-side where a client cannot clear it.
 */

const ACCOUNTS_KEY = 'admin.auth.enrollments'
const LOCKOUTS_KEY = 'admin.auth.lockouts'
const SESSION_KEY = 'admin.auth.session'

/** Lockout policy. Mirrors what the server will enforce. */
export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

export const ISSUER = 'Panel Admin'

export type DemoAccount = {
  id: string
  name: string
  email: string
  password: string
  roleCode: RoleCode
}

/**
 * Seed directory. Every account shares one password so the roles can be
 * compared quickly; the login screen lists them.
 */
export const DEMO_PASSWORD = 'Plataforma2026!'

export const ACCOUNTS: DemoAccount[] = [
  {
    id: '9a3f1e2b-0000-4000-8000-000000000001',
    name: 'Alex Ramírez',
    email: 'alex.ramirez@plataforma.mx',
    password: DEMO_PASSWORD,
    roleCode: 'super_admin',
  },
  {
    id: '9a3f1e2b-0000-4000-8000-000000000002',
    name: 'Diana Ortega',
    email: 'diana.ortega@plataforma.mx',
    password: DEMO_PASSWORD,
    roleCode: 'ops',
  },
  {
    id: '9a3f1e2b-0000-4000-8000-000000000003',
    name: 'Mario Beltrán',
    email: 'mario.beltran@plataforma.mx',
    password: DEMO_PASSWORD,
    roleCode: 'finance',
  },
  {
    id: '9a3f1e2b-0000-4000-8000-000000000004',
    name: 'Sofía Núñez',
    email: 'sofia.nunez@plataforma.mx',
    password: DEMO_PASSWORD,
    roleCode: 'support',
  },
  {
    id: '9a3f1e2b-0000-4000-8000-000000000005',
    name: 'Luis Carranza',
    email: 'luis.carranza@plataforma.mx',
    password: DEMO_PASSWORD,
    roleCode: 'compliance',
  },
  {
    id: '9a3f1e2b-0000-4000-8000-000000000006',
    name: 'Paula Vega',
    email: 'paula.vega@plataforma.mx',
    password: DEMO_PASSWORD,
    roleCode: 'read_only',
  },
]

export type Enrollment = {
  secret: string
  recoveryCodes: string[]
  usedRecoveryCodes: string[]
  enrolledAt: string
}

type LockoutRecord = {
  failedAttempts: number
  lockedUntil: number | null
}

export type StoredSession = {
  email: string
  issuedAt: string
}

// ---------------------------------------------------------------- storage ---

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function findAccount(email: string): DemoAccount | undefined {
  const normalized = normalizeEmail(email)
  return ACCOUNTS.find((account) => account.email === normalized)
}

// ------------------------------------------------------------- enrollment ---

function readEnrollments(): Record<string, Enrollment> {
  return readJson<Record<string, Enrollment>>(ACCOUNTS_KEY, {})
}

export function getEnrollment(email: string): Enrollment | undefined {
  return readEnrollments()[normalizeEmail(email)]
}

export function isEnrolled(email: string): boolean {
  return getEnrollment(email) !== undefined
}

function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = []

  for (let i = 0; i < count; i += 1) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`.toUpperCase())
  }

  return codes
}

/** Begins enrolment. Nothing is persisted until confirmEnrollment succeeds. */
export function beginEnrollment(): { secret: string; recoveryCodes: string[] } {
  return { secret: generateSecret(), recoveryCodes: generateRecoveryCodes() }
}

/** Persists the enrolment only once the user has proved they can generate a code. */
export function confirmEnrollment(email: string, secret: string, recoveryCodes: string[]): void {
  const enrollments = readEnrollments()

  enrollments[normalizeEmail(email)] = {
    secret,
    recoveryCodes,
    usedRecoveryCodes: [],
    enrolledAt: new Date().toISOString(),
  }

  writeJson(ACCOUNTS_KEY, enrollments)
}

// ---------------------------------------------------------------- lockout ---

function readLockouts(): Record<string, LockoutRecord> {
  return readJson<Record<string, LockoutRecord>>(LOCKOUTS_KEY, {})
}

function readLockout(email: string): LockoutRecord {
  return readLockouts()[normalizeEmail(email)] ?? { failedAttempts: 0, lockedUntil: null }
}

function writeLockout(email: string, record: LockoutRecord): void {
  const lockouts = readLockouts()
  lockouts[normalizeEmail(email)] = record
  writeJson(LOCKOUTS_KEY, lockouts)
}

export function clearLockout(email: string): void {
  writeLockout(email, { failedAttempts: 0, lockedUntil: null })
}

export function lockedUntil(email: string, now = Date.now()): number | null {
  const record = readLockout(email)

  if (record.lockedUntil !== null && record.lockedUntil > now) {
    return record.lockedUntil
  }

  return null
}

function registerFailure(email: string, now = Date.now()): LockoutRecord {
  const record = readLockout(email)
  const failedAttempts = record.failedAttempts + 1

  const next: LockoutRecord =
    failedAttempts >= MAX_FAILED_ATTEMPTS
      ? { failedAttempts, lockedUntil: now + LOCKOUT_DURATION_MS }
      : { failedAttempts, lockedUntil: null }

  writeLockout(email, next)
  return next
}

// ------------------------------------------------------------------ login ---

export type Challenge = {
  token: string
  email: string
  name: string
}

export type LoginResult =
  | { status: 'needs_code'; challenge: Challenge }
  | { status: 'needs_enrollment'; challenge: Challenge }
  | { status: 'invalid_credentials'; attemptsRemaining: number }
  | { status: 'locked'; unlockAt: number }

/**
 * Step one of sign-in. Never returns a session: 2FA is mandatory, so the only
 * successful outcomes are a code challenge or an enrolment challenge.
 *
 * An unknown email is reported exactly like a wrong password, and is subject
 * to the same lockout, so the response cannot be used to enumerate accounts.
 */
export function login(email: string, password: string, now = Date.now()): LoginResult {
  const lockUntil = lockedUntil(email, now)
  if (lockUntil !== null) {
    return { status: 'locked', unlockAt: lockUntil }
  }

  const account = findAccount(email)

  if (!account || account.password !== password) {
    const record = registerFailure(email, now)

    if (record.lockedUntil !== null) {
      return { status: 'locked', unlockAt: record.lockedUntil }
    }

    return {
      status: 'invalid_credentials',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - record.failedAttempts,
    }
  }

  clearLockout(account.email)

  const challenge: Challenge = {
    token: crypto.randomUUID(),
    email: account.email,
    name: account.name,
  }

  return isEnrolled(account.email)
    ? { status: 'needs_code', challenge }
    : { status: 'needs_enrollment', challenge }
}

export type CodeResult =
  | { status: 'ok' }
  | { status: 'invalid'; attemptsRemaining: number }
  | { status: 'locked'; unlockAt: number }

/** Step two: verify a TOTP code against the stored enrolment. */
export async function verifyCode(
  email: string,
  code: string,
  now = Date.now(),
): Promise<CodeResult> {
  const lockUntil = lockedUntil(email, now)
  if (lockUntil !== null) {
    return { status: 'locked', unlockAt: lockUntil }
  }

  const enrollment = getEnrollment(email)
  if (!enrollment) {
    return { status: 'invalid', attemptsRemaining: MAX_FAILED_ATTEMPTS }
  }

  const valid = await verifyTotp(enrollment.secret, code, { timestampMs: now, window: 1 })

  if (!valid) {
    const record = registerFailure(email, now)

    if (record.lockedUntil !== null) {
      return { status: 'locked', unlockAt: record.lockedUntil }
    }

    return {
      status: 'invalid',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - record.failedAttempts,
    }
  }

  clearLockout(email)
  return { status: 'ok' }
}

/** Recovery codes are single use: a consumed code is burned immediately. */
export function verifyRecoveryCode(email: string, code: string, now = Date.now()): CodeResult {
  const lockUntil = lockedUntil(email, now)
  if (lockUntil !== null) {
    return { status: 'locked', unlockAt: lockUntil }
  }

  const enrollments = readEnrollments()
  const key = normalizeEmail(email)
  const enrollment = enrollments[key]
  const candidate = code.trim().toUpperCase()

  const usable =
    enrollment !== undefined &&
    enrollment.recoveryCodes.includes(candidate) &&
    !enrollment.usedRecoveryCodes.includes(candidate)

  if (!enrollment || !usable) {
    const record = registerFailure(email, now)

    if (record.lockedUntil !== null) {
      return { status: 'locked', unlockAt: record.lockedUntil }
    }

    return {
      status: 'invalid',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - record.failedAttempts,
    }
  }

  enrollment.usedRecoveryCodes.push(candidate)
  enrollments[key] = enrollment
  writeJson(ACCOUNTS_KEY, enrollments)

  clearLockout(email)
  return { status: 'ok' }
}

export function remainingRecoveryCodes(email: string): number {
  const enrollment = getEnrollment(email)
  if (!enrollment) {
    return 0
  }
  return enrollment.recoveryCodes.length - enrollment.usedRecoveryCodes.length
}

// ---------------------------------------------------------------- session ---

export function readSession(): StoredSession | null {
  const session = readJson<StoredSession | null>(SESSION_KEY, null)

  if (!session || !findAccount(session.email)) {
    return null
  }

  return session
}

export function writeSession(email: string): StoredSession {
  const session: StoredSession = {
    email: normalizeEmail(email),
    issuedAt: new Date().toISOString(),
  }

  writeJson(SESSION_KEY, session)
  return session
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
