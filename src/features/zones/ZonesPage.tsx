import { useQueryClient } from '@tanstack/react-query'
import { Map, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge, Button, DateTime } from '@/components/ui'
import { ZoneEditor } from '@/features/zones/ZoneEditor'
import { ResourceListPage, defineResource } from '@/framework'
import { formatArea, ringAreaKm2 } from '@/lib/geo'
import { queryCollection } from '@/lib/mock-api'
import { deleteZone, listZones, setZoneActive, type Zone } from '@/lib/zones'
import { findMarket } from '@/lib/markets'

/*
 * A-012 Zones list.
 *
 * The second screen built on the resource framework. Everything except the map
 * editor is one defineResource call - the point of the framework being that
 * the list part costs almost nothing.
 */

const RESOURCE_KEY = 'zones'

export function ZonesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Zone | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [RESOURCE_KEY] })
  }

  const openCreate = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const openEdit = (zone: Zone) => {
    setEditing(zone)
    setEditorOpen(true)
  }

  const config = useMemo(
    () =>
      defineResource<Zone>({
        key: RESOURCE_KEY,
        title: 'Zonas de reparto',
        description:
          'Una zona es la unidad de cobertura, tarifas, oferta de repartidores y horarios de venta de alcohol.',
        permission: 'zones.manage',
        getRowId: (row) => row.id,
        searchPlaceholder: 'Buscar zona…',
        defaultSort: { id: 'name', direction: 'asc' },
        onRowClick: openEdit,

        columns: [
          {
            id: 'name',
            header: 'Zona',
            sortable: true,
            cell: (row) => <span className="font-medium">{row.name}</span>,
            exportValue: (row) => row.name,
          },
          {
            id: 'market',
            header: 'Mercado',
            sortable: true,
            cell: (row) => (
              <span className="text-xs text-ink-muted">
                {findMarket(row.marketId)?.name ?? '—'}
              </span>
            ),
            exportValue: (row) => findMarket(row.marketId)?.code ?? '',
          },
          {
            id: 'points',
            header: 'Puntos',
            numeric: true,
            cell: (row) => row.boundary.length,
            exportValue: (row) => row.boundary.length,
          },
          {
            id: 'area',
            header: 'Área',
            numeric: true,
            sortable: true,
            cell: (row) => formatArea(ringAreaKm2(row.boundary)),
            exportValue: (row) => Math.round(ringAreaKm2(row.boundary) * 100) / 100,
          },
          {
            id: 'priority',
            header: 'Prioridad',
            numeric: true,
            sortable: true,
            cell: (row) => row.priority,
            exportValue: (row) => row.priority,
          },
          {
            id: 'isActive',
            header: 'Estado',
            sortable: true,
            cell: (row) =>
              row.isActive ? (
                <Badge tone="positive" dot>
                  Activa
                </Badge>
              ) : (
                <Badge tone="neutral">Inactiva</Badge>
              ),
            exportValue: (row) => (row.isActive ? 'activa' : 'inactiva'),
          },
          {
            id: 'createdAt',
            header: 'Creada',
            sortable: true,
            defaultHidden: true,
            cell: (row) => <DateTime value={row.createdAt} display="date" />,
            exportValue: (row) => row.createdAt,
          },
        ],

        filters: [
          {
            id: 'marketId',
            type: 'select',
            label: 'Mercado',
            allLabel: 'Todos los mercados',
            options: listZones()
              .map((zone) => zone.marketId)
              .filter((id, index, all) => all.indexOf(id) === index)
              .map((id) => ({ value: id, label: findMarket(id)?.name ?? id })),
          },
          {
            id: 'isActive',
            type: 'boolean',
            label: 'Estado',
            trueLabel: 'Activas',
            falseLabel: 'Inactivas',
          },
        ],

        fetch: (query) =>
          queryCollection(listZones(), query, {
            searchFields: (row) => [row.name, findMarket(row.marketId)?.name ?? ''],
            sortValues: (row) => ({
              name: row.name,
              market: findMarket(row.marketId)?.name ?? '',
              area: ringAreaKm2(row.boundary),
              priority: row.priority,
              isActive: row.isActive,
              createdAt: row.createdAt,
            }),
            filterValues: (row) => ({
              marketId: row.marketId,
              isActive: String(row.isActive),
            }),
          }),

        toolbar: (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            leadingIcon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            Nueva zona
          </Button>
        ),

        rowActions: [
          {
            id: 'edit',
            label: 'Editar contorno',
            icon: <Map aria-hidden="true" className="size-3.5" />,
            permission: 'zones.manage',
            run: openEdit,
          },
          {
            id: 'rename',
            label: 'Editar datos',
            icon: <Pencil aria-hidden="true" className="size-3.5" />,
            permission: 'zones.manage',
            run: openEdit,
          },
          {
            id: 'activate',
            label: 'Activar zona',
            icon: <Power aria-hidden="true" className="size-3.5" />,
            permission: 'zones.manage',
            hidden: (row) => row.isActive,
            confirm: {
              title: 'Activar zona',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> empezará a recibir pedidos.
                </>
              ),
              consequence: () =>
                'Los comercios con cobertura en esta zona serán visibles para los clientes.',
              confirmLabel: 'Activar',
            },
            run: (row) => {
              setZoneActive(row.id, true)
            },
          },
          {
            id: 'deactivate',
            label: 'Desactivar zona',
            icon: <PowerOff aria-hidden="true" className="size-3.5" />,
            permission: 'zones.manage',
            hidden: (row) => !row.isActive,
            tone: 'danger',
            confirm: {
              title: 'Desactivar zona',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> dejará de aceptar pedidos.
                </>
              ),
              consequence: () =>
                'Las direcciones dentro de esta zona quedarán sin cobertura salvo que otra zona activa las cubra.',
              confirmLabel: 'Desactivar',
              requireReason: true,
            },
            run: (row) => {
              setZoneActive(row.id, false)
            },
          },
          {
            id: 'delete',
            label: 'Eliminar',
            icon: <Trash2 aria-hidden="true" className="size-3.5" />,
            permission: 'zones.manage',
            tone: 'danger',
            disabled: (row) => (row.isActive ? 'Desactiva la zona antes de eliminarla.' : false),
            confirm: {
              title: 'Eliminar zona',
              description: (row) => (
                <>
                  Se eliminará <strong className="text-ink">{row.name}</strong> y su contorno.
                </>
              ),
              consequence: () =>
                'Las tarifas y horarios de venta asociados a esta zona quedarán huérfanos. No se puede deshacer.',
              confirmLabel: 'Eliminar definitivamente',
              typedConfirmation: (row) => row.name,
              requireReason: true,
            },
            run: (row) => {
              deleteZone(row.id)
            },
          },
        ],

        emptyTitle: 'Aún no hay zonas',
        emptyDescription:
          'Dibuja la primera zona para definir dónde entrega la plataforma en este mercado.',
      }),
    [],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <ZoneEditor
        open={editorOpen}
        zone={editing}
        onClose={() => {
          setEditorOpen(false)
        }}
        onSaved={refresh}
      />
    </>
  )
}
