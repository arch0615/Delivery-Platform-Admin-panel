/*
 * AUDIT LOG
 *
 * Mirrors the `audit_log` table (database schema.txt §3), which is append-only:
 * the app role has UPDATE and DELETE revoked. Required the moment staff can
 * issue refunds or change who has access.
 *
 * Entries carry before/after snapshots so a change can be explained months
 * later. "Who turned this off?" is the question this table exists to answer.
 */

export type AuditActorType = 'admin' | 'system'

export type AuditEntry = {
  id: number
  actorType: AuditActorType
  actorName: string
  actorEmail: string
  /** Domain-qualified verb: 'role.update', 'settings.change', 'zone.delete'. */
  action: string
  entityType: string
  entityId: string
  entityLabel: string
  before: unknown
  after: unknown
  /** Operator-supplied justification, where the action demanded one. */
  reason: string | null
  createdAt: string
}

export type RecordInput = {
  actorName: string
  actorEmail: string
  action: string
  entityType: string
  entityId: string
  entityLabel: string
  before?: unknown
  after?: unknown
  reason?: string | null
  actorType?: AuditActorType
}

const SEED: AuditEntry[] = [
  {
    id: 4,
    actorType: 'admin',
    actorName: 'Alex Ramírez',
    actorEmail: 'alex.ramirez@plataforma.mx',
    action: 'market.activate',
    entityType: 'market',
    entityId: 'MX-MTY',
    entityLabel: 'Monterrey',
    before: { isLive: false },
    after: { isLive: true },
    reason: 'Zonas y tarifas configuradas; inicio de operación.',
    createdAt: '2026-05-11T15:04:00Z',
  },
  {
    id: 3,
    actorType: 'admin',
    actorName: 'Luis Carranza',
    actorEmail: 'luis.carranza@plataforma.mx',
    action: 'vertical.deactivate',
    entityType: 'vertical',
    entityId: 'pharmacy',
    entityLabel: 'Farmacia',
    before: { isActive: true },
    after: { isActive: false },
    reason: 'Pendiente validación COFEPRIS y flujo de recetas.',
    createdAt: '2026-04-22T11:30:00Z',
  },
  {
    id: 2,
    actorType: 'admin',
    actorName: 'Alex Ramírez',
    actorEmail: 'alex.ramirez@plataforma.mx',
    action: 'role.update',
    entityType: 'role',
    entityId: 'support',
    entityLabel: 'Soporte',
    before: { permissions: ['support.*', 'orders.view', 'customers.view'] },
    after: {
      permissions: ['support.*', 'orders.view', 'orders.cancel', 'customers.view'],
    },
    reason: 'Soporte necesita cancelar pedidos antes de que el comercio acepte.',
    createdAt: '2026-04-02T09:12:00Z',
  },
  {
    id: 1,
    actorType: 'system',
    actorName: 'Sistema',
    actorEmail: '—',
    action: 'platform.seed',
    entityType: 'platform',
    entityId: 'bootstrap',
    entityLabel: 'Configuración inicial',
    before: null,
    after: { markets: 1, verticals: 5 },
    reason: null,
    createdAt: '2026-03-01T00:00:00Z',
  },
]

let entries: AuditEntry[] = [...SEED]
let nextId = Math.max(...SEED.map((entry) => entry.id)) + 1

export function listAuditEntries(): readonly AuditEntry[] {
  return entries
}

/**
 * Append an entry. Never updates or removes one - a corrected record is a new
 * entry, matching the table's append-only grant.
 */
export function recordAudit(input: RecordInput): AuditEntry {
  const entry: AuditEntry = {
    id: nextId,
    actorType: input.actorType ?? 'admin',
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
    createdAt: new Date().toISOString(),
  }

  nextId += 1
  entries = [entry, ...entries]
  return entry
}

/** Distinct actions present, for the log's filter dropdown. */
export function auditActions(): string[] {
  return Array.from(new Set(entries.map((entry) => entry.action))).sort()
}

export function auditEntityTypes(): string[] {
  return Array.from(new Set(entries.map((entry) => entry.entityType))).sort()
}
