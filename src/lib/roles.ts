import { ROLES, type Permission, type Role, type RoleCode } from '@/lib/permissions'

/*
 * ROLES STORE
 *
 * Roles are rows in the `roles` table carrying a permissions[] array, so a new
 * role needs no deploy (database schema.txt §3). That is exactly why they are
 * editable here rather than a frozen constant.
 *
 * `super_admin` is protected: it holds the wildcard, and letting it be edited
 * or deleted is how an organisation locks itself out of its own platform.
 */

export const PROTECTED_ROLE_CODES: RoleCode[] = ['super_admin']

export function isProtectedRole(code: RoleCode): boolean {
  return PROTECTED_ROLE_CODES.includes(code)
}

let roles: Role[] = Object.values(ROLES).map((role) => ({
  ...role,
  permissions: [...role.permissions],
}))

export function listRoles(): readonly Role[] {
  return roles
}

export function findRole(code: RoleCode): Role | undefined {
  return roles.find((role) => role.code === code)
}

export function upsertRole(input: Role): void {
  const exists = roles.some((role) => role.code === input.code)
  roles = exists
    ? roles.map((role) => (role.code === input.code ? input : role))
    : [...roles, input]
}

export function deleteRole(code: RoleCode): void {
  if (isProtectedRole(code)) {
    return
  }
  roles = roles.filter((role) => role.code !== code)
}

/** Expanded permission count, for showing what a role actually reaches. */
export function grantedCount(permissions: readonly Permission[], total: number): number {
  return permissions.includes('*') ? total : permissions.length
}
