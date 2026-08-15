import {
  Banknote,
  BookLock,
  Boxes,
  ClipboardCheck,
  FileText,
  Gauge,
  Home,
  LifeBuoy,
  LayoutGrid,
  Map,
  Megaphone,
  Percent,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { Permission } from '@/lib/permissions'

/*
 * NAVIGATION MODEL
 *
 * Single source of truth for the sidebar, the breadcrumbs, and the route
 * table. Each item carries:
 *
 *   id          the screen ID from "admin panel page list.txt"
 *   permission  what the viewer must hold to see it at all
 *   sprint      when it is scheduled, so placeholders can say so
 *
 * A viewer without the permission does not get a disabled link - the item and
 * its group disappear entirely. A `support` role must see no Finanzas group,
 * not a greyed one (acceptance criterion for A-003).
 */

export type NavItem = {
  id: string
  label: string
  path: string
  permission: Permission
  sprint: number
  /** Marks screens deferred past launch, shown differently in placeholders. */
  deferred?: boolean
}

export type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}

/** Standalone entry above the grouped navigation. */
export const NAV_HOME: NavItem = {
  id: 'A-000',
  label: 'Inicio',
  path: '/',
  permission: 'orders.view',
  sprint: 1,
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operations',
    label: 'Operaciones',
    icon: Gauge,
    items: [
      {
        id: 'A-041',
        label: 'Pedidos en vivo',
        path: '/ops/orders',
        permission: 'orders.view',
        sprint: 5,
      },
      {
        id: 'A-042',
        label: 'Asignación',
        path: '/ops/dispatch',
        permission: 'dispatch.view',
        sprint: 5,
      },
      {
        id: 'A-043',
        label: 'Mapa de repartidores',
        path: '/ops/couriers-live',
        permission: 'dispatch.view',
        sprint: 5,
      },
    ],
  },
  {
    id: 'merchants',
    label: 'Comercios',
    icon: Store,
    items: [
      {
        id: 'A-021',
        label: 'Todos los comercios',
        path: '/merchants',
        permission: 'merchants.view',
        sprint: 3,
      },
      {
        id: 'A-028',
        label: 'Aprobaciones',
        path: '/merchants/approvals',
        permission: 'merchants.approve',
        sprint: 3,
      },
    ],
  },
  {
    id: 'couriers',
    label: 'Repartidores',
    icon: Truck,
    items: [
      {
        id: 'A-031',
        label: 'Todos los repartidores',
        path: '/couriers',
        permission: 'couriers.view',
        sprint: 4,
      },
      {
        id: 'A-033',
        label: 'Aprobaciones',
        path: '/couriers/approvals',
        permission: 'couriers.approve',
        sprint: 4,
      },
      {
        id: 'A-034',
        label: 'Documentos por vencer',
        path: '/couriers/documents',
        permission: 'couriers.view',
        sprint: 4,
      },
    ],
  },
  {
    id: 'customers',
    label: 'Clientes',
    icon: Users,
    items: [
      {
        id: 'A-035',
        label: 'Buscar clientes',
        path: '/customers',
        permission: 'customers.view',
        sprint: 4,
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    icon: Boxes,
    items: [
      {
        id: 'A-016',
        label: 'Verticales',
        path: '/catalog/verticals',
        permission: 'catalog.view',
        sprint: 2,
      },
      {
        id: 'A-017',
        label: 'Categorías',
        path: '/catalog/categories',
        permission: 'catalog.view',
        sprint: 2,
      },
      {
        id: 'A-018',
        label: 'Artículos restringidos',
        path: '/catalog/restricted-items',
        permission: 'catalog.view',
        sprint: 2,
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Precios',
    icon: Percent,
    items: [
      {
        id: 'A-051',
        label: 'Comisiones',
        path: '/pricing/commissions',
        permission: 'commission.view',
        sprint: 6,
      },
      {
        id: 'A-053',
        label: 'Tarifas',
        path: '/pricing/fees',
        permission: 'pricing.view',
        sprint: 6,
      },
      {
        id: 'A-054',
        label: 'Precio dinámico',
        path: '/pricing/surge',
        permission: 'pricing.view',
        sprint: 6,
      },
    ],
  },
  {
    id: 'promotions',
    label: 'Promociones',
    icon: Megaphone,
    items: [
      {
        id: 'A-055',
        label: 'Campañas',
        path: '/promotions',
        permission: 'promotions.view',
        sprint: 6,
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    icon: Banknote,
    items: [
      {
        id: 'A-061',
        label: 'Reembolsos',
        path: '/finance/refunds',
        permission: 'finance.refunds',
        sprint: 7,
      },
      {
        id: 'A-062',
        label: 'Libro mayor',
        path: '/finance/ledger',
        permission: 'finance.ledger',
        sprint: 7,
      },
      {
        id: 'A-064',
        label: 'Liquidaciones',
        path: '/finance/settlements',
        permission: 'finance.settlements',
        sprint: 7,
      },
      {
        id: 'A-072',
        label: 'Dispersiones',
        path: '/finance/payouts',
        permission: 'finance.payouts',
        sprint: 8,
      },
      {
        id: 'A-073',
        label: 'CFDI',
        path: '/finance/cfdi',
        permission: 'finance.cfdi',
        sprint: 8,
      },
      {
        id: 'A-066',
        label: 'Contracargos',
        path: '/finance/chargebacks',
        permission: 'finance.view',
        sprint: 7,
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Cumplimiento',
    icon: ShieldCheck,
    items: [
      {
        id: 'A-074',
        label: 'Licencias de alcohol',
        path: '/compliance/licenses',
        permission: 'compliance.view',
        sprint: 8,
      },
      {
        id: 'A-075',
        label: 'Horarios de venta',
        path: '/compliance/sale-windows',
        permission: 'compliance.view',
        sprint: 8,
      },
      {
        id: 'A-076',
        label: 'Ley seca',
        path: '/compliance/blackouts',
        permission: 'compliance.manage',
        sprint: 8,
      },
      {
        id: 'A-081',
        label: 'Verificación de edad',
        path: '/compliance/age-verifications',
        permission: 'compliance.age',
        sprint: 9,
      },
      {
        id: 'A-082',
        label: 'Solicitudes ARCO',
        path: '/compliance/arco',
        permission: 'compliance.arco',
        sprint: 9,
      },
    ],
  },
  {
    id: 'support',
    label: 'Soporte',
    icon: LifeBuoy,
    items: [
      {
        id: 'A-083',
        label: 'Tickets',
        path: '/support/tickets',
        permission: 'support.view',
        sprint: 9,
      },
    ],
  },
  {
    id: 'content',
    label: 'Contenido',
    icon: FileText,
    items: [
      {
        id: 'A-085',
        label: 'Banners',
        path: '/content/banners',
        permission: 'content.manage',
        sprint: 9,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: LayoutGrid,
    items: [
      {
        id: 'A-086',
        label: 'Resumen',
        path: '/reports/overview',
        permission: 'reports.view',
        sprint: 9,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Plataforma',
    icon: Settings,
    items: [
      {
        id: 'A-011',
        label: 'Mercados',
        path: '/settings/markets',
        permission: 'platform.manage',
        sprint: 2,
      },
      {
        id: 'A-012',
        label: 'Zonas',
        path: '/settings/zones',
        permission: 'zones.manage',
        sprint: 2,
      },
      {
        id: 'A-013',
        label: 'Roles y permisos',
        path: '/settings/roles',
        permission: 'users.manage',
        sprint: 2,
      },
      {
        id: 'A-014',
        label: 'Usuarios',
        path: '/settings/users',
        permission: 'users.manage',
        sprint: 2,
      },
      {
        id: 'A-015',
        label: 'Configuración',
        path: '/settings/platform',
        permission: 'platform.manage',
        sprint: 2,
      },
      {
        id: 'A-087',
        label: 'Salud del sistema',
        path: '/system/jobs',
        permission: 'platform.view',
        sprint: 9,
      },
      {
        id: 'A-007',
        label: 'Bitácora',
        path: '/audit-log',
        permission: 'audit.view',
        sprint: 1,
      },
    ],
  },
]

/** Extra icons used by placeholder pages and breadcrumbs. */
export const ICONS = {
  home: Home,
  map: Map,
  ledger: ScrollText,
  approvals: ClipboardCheck,
  audit: BookLock,
} as const

export const ALL_NAV_ITEMS: NavItem[] = [NAV_HOME, ...NAV_GROUPS.flatMap((group) => group.items)]

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.path === pathname)
}

export function findNavGroup(pathname: string): NavGroup | undefined {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.path === pathname))
}
