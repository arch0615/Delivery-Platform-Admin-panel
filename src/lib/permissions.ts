/*
 * PERMISSIONS
 *
 * Permission strings are grouped by domain: 'orders.refund', 'finance.payouts'.
 * Roles are rows in the `roles` table carrying a permissions[] array, so a new
 * role needs no deploy (see database schema.txt §3).
 *
 * IMPORTANT: this module decides what the UI *shows*. It is not a security
 * boundary. The server re-checks every permission on every request; hiding a
 * button is UX, not authorization (web architecture.txt §8.5.4).
 */

export type Permission = string

/** Grants everything. Only super_admin holds it. */
export const WILDCARD = '*'

/**
 * Does this permission set satisfy `required`?
 *
 * Supports three forms:
 *   '*'            grants everything
 *   'finance.*'    grants every permission in the finance domain
 *   'finance.view' exact match
 */
export function hasPermission(granted: readonly Permission[], required: Permission): boolean {
  for (const permission of granted) {
    if (permission === WILDCARD || permission === required) {
      return true
    }

    if (permission.endsWith('.*')) {
      const domain = permission.slice(0, -1) // 'finance.*' -> 'finance.'
      if (required.startsWith(domain)) {
        return true
      }
    }
  }

  return false
}

export function hasAnyPermission(
  granted: readonly Permission[],
  required: readonly Permission[],
): boolean {
  return required.some((permission) => hasPermission(granted, permission))
}

export type RoleCode = 'super_admin' | 'ops' | 'finance' | 'support' | 'compliance' | 'read_only'

export type Role = {
  code: RoleCode
  name: string
  description: string
  permissions: Permission[]
}

/**
 * Seed roles. These mirror the roles table and exist here only until
 * GET /admin/me is available; the shape is the same either way.
 */
export const ROLES: Record<RoleCode, Role> = {
  super_admin: {
    code: 'super_admin',
    name: 'Administrador general',
    description: 'Acceso total a la plataforma.',
    permissions: [WILDCARD],
  },
  ops: {
    code: 'ops',
    name: 'Operaciones',
    description: 'Pedidos en vivo, asignación y participantes.',
    permissions: [
      'orders.*',
      'dispatch.*',
      'merchants.view',
      'couriers.view',
      'customers.view',
      'catalog.view',
      'reports.view',
      'platform.view',
    ],
  },
  finance: {
    code: 'finance',
    name: 'Finanzas',
    description: 'Comisiones, liquidaciones, dispersiones y facturación.',
    permissions: [
      'finance.*',
      'commission.*',
      'pricing.*',
      'promotions.view',
      'orders.view',
      'merchants.view',
      'reports.view',
      'audit.view',
    ],
  },
  support: {
    code: 'support',
    name: 'Soporte',
    description: 'Atención a clientes y comercios. Sin acceso a finanzas.',
    permissions: [
      'support.*',
      'orders.view',
      'orders.cancel',
      'customers.view',
      'merchants.view',
      'couriers.view',
    ],
  },
  compliance: {
    code: 'compliance',
    name: 'Cumplimiento',
    description: 'Licencias, horarios de venta, ley seca y verificación de edad.',
    permissions: ['compliance.*', 'merchants.view', 'orders.view', 'catalog.view', 'audit.view'],
  },
  read_only: {
    code: 'read_only',
    name: 'Solo lectura',
    description: 'Consulta sin acciones.',
    permissions: [
      'orders.view',
      'merchants.view',
      'couriers.view',
      'customers.view',
      'catalog.view',
      'reports.view',
    ],
  },
}

export const ROLE_LIST: Role[] = Object.values(ROLES)
