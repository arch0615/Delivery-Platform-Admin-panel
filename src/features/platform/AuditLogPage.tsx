import { Eye } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge, Button, DateTime, Drawer } from '@/components/ui'
import { ResourceListPage, defineResource } from '@/framework'
import { auditActions, auditEntityTypes, listAuditEntries, type AuditEntry } from '@/lib/audit'
import { queryCollection } from '@/lib/mock-api'

/*
 * A-007 Audit log.
 *
 * Append-only: the table has UPDATE and DELETE revoked for the app role, and
 * this screen is read-only to match. A correction is a new entry.
 *
 * The before/after snapshots are the point. "Who turned this off, and why?" is
 * the question the table exists to answer, months after the fact.
 */

const RESOURCE_KEY = 'audit-log'

export function AuditLogPage() {
  const [viewing, setViewing] = useState<AuditEntry | null>(null)

  const config = useMemo(
    () =>
      defineResource<AuditEntry>({
        key: RESOURCE_KEY,
        title: 'Bitácora',
        description:
          'Registro de cada acción administrativa. Solo lectura: una corrección es un registro nuevo, no una edición.',
        permission: 'audit.view',
        getRowId: (row) => String(row.id),
        searchPlaceholder: 'Buscar por acción, entidad o persona…',
        defaultSort: { id: 'createdAt', direction: 'desc' },
        onRowClick: setViewing,

        columns: [
          {
            id: 'createdAt',
            header: 'Fecha',
            sortable: true,
            cell: (row) => <DateTime value={row.createdAt} />,
            exportValue: (row) => row.createdAt,
          },
          {
            id: 'actor',
            header: 'Quién',
            sortable: true,
            cell: (row) => (
              <span className="min-w-0">
                <span className="block text-sm">{row.actorName}</span>
                <span className="block text-[11px] text-ink-muted">{row.actorEmail}</span>
              </span>
            ),
            exportValue: (row) => `${row.actorName} <${row.actorEmail}>`,
          },
          {
            id: 'action',
            header: 'Acción',
            sortable: true,
            cell: (row) => (
              <span className="font-mono text-xs font-medium text-ink">{row.action}</span>
            ),
            exportValue: (row) => row.action,
          },
          {
            id: 'entity',
            header: 'Entidad',
            sortable: true,
            cell: (row) => (
              <span className="min-w-0">
                <span className="block text-sm">{row.entityLabel}</span>
                <span className="block font-mono text-[11px] text-ink-subtle">
                  {row.entityType}
                </span>
              </span>
            ),
            exportValue: (row) => `${row.entityType}:${row.entityId}`,
          },
          {
            id: 'reason',
            header: 'Motivo',
            cell: (row) =>
              row.reason ? (
                <span className="text-xs text-ink-muted">{row.reason}</span>
              ) : (
                <span className="text-xs text-ink-subtle">—</span>
              ),
            exportValue: (row) => row.reason ?? '',
          },
        ],

        filters: [
          {
            id: 'action',
            type: 'select',
            label: 'Acción',
            allLabel: 'Todas las acciones',
            options: auditActions().map((action) => ({ value: action, label: action })),
          },
          {
            id: 'entityType',
            type: 'select',
            label: 'Entidad',
            allLabel: 'Todas las entidades',
            options: auditEntityTypes().map((type) => ({ value: type, label: type })),
          },
        ],

        fetch: (query) =>
          queryCollection(listAuditEntries(), query, {
            searchFields: (row) => [
              row.action,
              row.entityType,
              row.entityLabel,
              row.actorName,
              row.actorEmail,
              row.reason ?? '',
            ],
            sortValues: (row) => ({
              createdAt: row.createdAt,
              actor: row.actorName,
              action: row.action,
              entity: row.entityLabel,
            }),
            filterValues: (row) => ({
              action: row.action,
              entityType: row.entityType,
            }),
          }),

        rowActions: [
          {
            id: 'view',
            label: 'Ver detalle',
            icon: <Eye aria-hidden="true" className="size-3.5" />,
            run: setViewing,
          },
        ],

        emptyTitle: 'Sin registros',
        emptyDescription: 'Las acciones administrativas aparecerán aquí.',
      }),
    [],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <Drawer
        open={viewing !== null}
        title={viewing?.action ?? ''}
        {...(viewing ? { description: `${viewing.entityType} · ${viewing.entityLabel}` } : {})}
        onClose={() => {
          setViewing(null)
        }}
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setViewing(null)
            }}
          >
            Cerrar
          </Button>
        }
      >
        {viewing ? (
          <div className="grid gap-4">
            <dl className="grid gap-2 text-sm">
              <Row label="Quién">
                {viewing.actorName}
                <span className="block text-xs text-ink-muted">{viewing.actorEmail}</span>
              </Row>
              <Row label="Cuándo">
                <DateTime value={viewing.createdAt} />
              </Row>
              <Row label="Origen">
                <Badge tone={viewing.actorType === 'system' ? 'neutral' : 'accent'}>
                  {viewing.actorType === 'system' ? 'Sistema' : 'Administrador'}
                </Badge>
              </Row>
              <Row label="Identificador">
                <span className="font-mono text-xs">{viewing.entityId}</span>
              </Row>
              {viewing.reason ? <Row label="Motivo">{viewing.reason}</Row> : null}
            </dl>

            <Snapshot title="Antes" value={viewing.before} />
            <Snapshot title="Después" value={viewing.after} />
          </div>
        ) : null}
      </Drawer>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-border-base pb-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  )
}

function Snapshot({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-muted">{title}</p>
      <pre className="mt-1 overflow-x-auto rounded-md bg-surface-sunken px-3 py-2 font-mono text-[11px] text-ink">
        {value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}
