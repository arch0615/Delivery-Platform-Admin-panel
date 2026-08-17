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

/*
 * PERMISSION CATALOGUE
 *
 * Every permission the application checks, grouped for the role editor. This
 * is the list an administrator picks from, so a permission missing here is a
 * permission nobody can grant - and one whose screens are unreachable forever.
 * A test asserts that everything nav.ts references appears below.
 */

export type PermissionDefinition = {
  key: Permission
  label: string
  /** Marks permissions that let the holder move money or change access. */
  sensitive?: boolean
}

export type PermissionDomain = {
  id: string
  label: string
  permissions: PermissionDefinition[]
}

export const PERMISSION_CATALOG: PermissionDomain[] = [
  {
    id: 'orders',
    label: 'Pedidos',
    permissions: [
      { key: 'orders.view', label: 'Ver pedidos' },
      { key: 'orders.cancel', label: 'Cancelar pedidos', sensitive: true },
      { key: 'orders.force_status', label: 'Forzar estado', sensitive: true },
    ],
  },
  {
    id: 'dispatch',
    label: 'Asignación',
    permissions: [
      { key: 'dispatch.view', label: 'Ver asignación y mapa' },
      { key: 'dispatch.assign', label: 'Asignar repartidores' },
      { key: 'dispatch.configure', label: 'Configurar reglas de asignación' },
    ],
  },
  {
    id: 'merchants',
    label: 'Comercios',
    permissions: [
      { key: 'merchants.view', label: 'Ver comercios' },
      { key: 'merchants.edit', label: 'Editar comercios' },
      { key: 'merchants.approve', label: 'Aprobar comercios', sensitive: true },
      { key: 'merchants.suspend', label: 'Suspender comercios', sensitive: true },
    ],
  },
  {
    id: 'couriers',
    label: 'Repartidores',
    permissions: [
      { key: 'couriers.view', label: 'Ver repartidores' },
      { key: 'couriers.edit', label: 'Editar repartidores' },
      { key: 'couriers.approve', label: 'Aprobar repartidores', sensitive: true },
    ],
  },
  {
    id: 'customers',
    label: 'Clientes',
    permissions: [
      { key: 'customers.view', label: 'Ver clientes' },
      { key: 'customers.edit', label: 'Editar clientes' },
      { key: 'customers.ban', label: 'Bloquear clientes', sensitive: true },
    ],
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    permissions: [
      { key: 'catalog.view', label: 'Ver catálogo y taxonomía' },
      { key: 'catalog.manage', label: 'Editar taxonomía' },
    ],
  },
  {
    id: 'pricing',
    label: 'Precios',
    permissions: [
      { key: 'pricing.view', label: 'Ver tarifas' },
      { key: 'pricing.manage', label: 'Editar tarifas', sensitive: true },
      { key: 'commission.view', label: 'Ver comisiones' },
      { key: 'commission.manage', label: 'Editar comisiones', sensitive: true },
      { key: 'promotions.view', label: 'Ver promociones' },
      { key: 'promotions.manage', label: 'Editar promociones', sensitive: true },
    ],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    permissions: [
      { key: 'finance.view', label: 'Ver finanzas' },
      { key: 'finance.refunds', label: 'Autorizar reembolsos', sensitive: true },
      { key: 'finance.ledger', label: 'Ver libro mayor' },
      { key: 'finance.settlements', label: 'Ejecutar liquidaciones', sensitive: true },
      { key: 'finance.payouts', label: 'Ejecutar dispersiones', sensitive: true },
      { key: 'finance.cfdi', label: 'Administrar CFDI', sensitive: true },
    ],
  },
  {
    id: 'compliance',
    label: 'Cumplimiento',
    permissions: [
      { key: 'compliance.view', label: 'Ver licencias y horarios' },
      { key: 'compliance.manage', label: 'Editar horarios y ley seca', sensitive: true },
      { key: 'compliance.age', label: 'Revisar verificación de edad', sensitive: true },
      { key: 'compliance.arco', label: 'Atender solicitudes ARCO', sensitive: true },
    ],
  },
  {
    id: 'support',
    label: 'Soporte',
    permissions: [
      { key: 'support.view', label: 'Ver tickets' },
      { key: 'support.respond', label: 'Responder tickets' },
    ],
  },
  {
    id: 'content',
    label: 'Contenido',
    permissions: [{ key: 'content.manage', label: 'Editar banners y campañas' }],
  },
  {
    id: 'reports',
    label: 'Reportes',
    permissions: [{ key: 'reports.view', label: 'Ver reportes' }],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    permissions: [
      { key: 'platform.view', label: 'Ver estado del sistema' },
      { key: 'platform.manage', label: 'Editar mercados y configuración', sensitive: true },
      { key: 'zones.manage', label: 'Editar zonas', sensitive: true },
      { key: 'users.manage', label: 'Administrar usuarios y roles', sensitive: true },
      { key: 'audit.view', label: 'Ver bitácora' },
    ],
  },
]

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.flatMap((domain) =>
  domain.permissions.map((permission) => permission.key),
)

export function isSensitivePermission(key: Permission): boolean {
  return PERMISSION_CATALOG.some((domain) =>
    domain.permissions.some((permission) => permission.key === key && permission.sensitive),
  )
}

export type RoleCode = string

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
/**
 * Seed roles. `satisfies` rather than an annotation keeps the keys literal, so
 * ROLES.super_admin is known to exist while the runtime store (lib/roles.ts)
 * stays open-ended - roles are editable data.
 */
export const ROLES = {
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
} satisfies Record<string, Role>

export const ROLE_LIST: Role[] = Object.values(ROLES)
