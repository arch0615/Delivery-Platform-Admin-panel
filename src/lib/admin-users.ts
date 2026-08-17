import { ACCOUNTS } from '@/lib/auth/mock-auth'
import type { RoleCode } from '@/lib/permissions'

/*
 * ADMIN USERS
 *
 * Mirrors `admin_users` (database schema.txt §3): a role plus an optional
 * market scope. An empty scope means every market.
 *
 * Seeded from the demo auth accounts so the list matches who can actually sign
 * in - two lists that disagree about who has access is its own security bug.
 */

export type AdminUserRecord = {
  id: string
  name: string
  email: string
  roleCode: RoleCode
  /** Empty means all markets. */
  marketScope: string[]
  totpEnabled: boolean
  isActive: boolean
  lastLoginAt: string | null
  invitedAt: string
}

const CDMX = '0f1c5b1a-0000-4000-8000-000000000001'
const GDL = '0f1c5b1a-0000-4000-8000-000000000002'

const SCOPE_BY_EMAIL: Record<string, string[]> = {
  'diana.ortega@plataforma.mx': [CDMX, GDL],
  'sofia.nunez@plataforma.mx': [CDMX],
}

let users: AdminUserRecord[] = ACCOUNTS.map((account, index) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  roleCode: account.roleCode,
  marketScope: SCOPE_BY_EMAIL[account.email] ?? [],
  totpEnabled: index === 0,
  isActive: true,
  lastLoginAt: index < 3 ? `2026-08-1${index + 2}T08:${20 + index}:00Z` : null,
  invitedAt: `2026-0${(index % 5) + 3}-0${(index % 8) + 1}T10:00:00Z`,
}))

export function listAdminUsers(): readonly AdminUserRecord[] {
  return users
}

export function findAdminUser(id: string): AdminUserRecord | undefined {
  return users.find((user) => user.id === id)
}

export function upsertAdminUser(input: AdminUserRecord): void {
  const exists = users.some((user) => user.id === input.id)
  users = exists ? users.map((user) => (user.id === input.id ? input : user)) : [input, ...users]
}

export function setAdminUserActive(id: string, isActive: boolean): void {
  users = users.map((user) => (user.id === id ? { ...user, isActive } : user))
}

/** Clears the enrolment so the next sign-in must set up a new authenticator. */
export function resetAdminUserTotp(id: string): void {
  users = users.map((user) => (user.id === id ? { ...user, totpEnabled: false } : user))
}

export function countUsersWithRole(roleCode: RoleCode): number {
  return users.filter((user) => user.roleCode === roleCode && user.isActive).length
}

export function createAdminUserId(): string {
  return crypto.randomUUID()
}
