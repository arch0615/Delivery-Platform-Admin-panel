import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Play, Plus, Trash2, Pause } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge, Button, DateTime } from '@/components/ui'
import { ResourceListPage, defineResource } from '@/framework'
import { MarketFormDrawer } from '@/features/markets/MarketFormDrawer'
import { queryCollection } from '@/lib/mock-api'
import { deleteMarket, listMarkets, setMarketLive, type Market } from '@/lib/markets'

/*
 * A-011 Markets.
 *
 * The first screen built on the resource framework, and the proof that a list
 * screen is configuration rather than a bespoke page: everything below the
 * drawer is one defineResource call.
 */

const RESOURCE_KEY = 'markets'

export function MarketsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Market | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [RESOURCE_KEY] })
  }

  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  const config = useMemo(
    () =>
      defineResource<Market>({
        key: RESOURCE_KEY,
        title: 'Mercados',
        description:
          'Cada mercado define moneda, zona horaria y régimen fiscal. Solo los mercados activos reciben pedidos.',
        permission: 'platform.manage',
        getRowId: (row) => row.id,
        searchPlaceholder: 'Buscar por nombre o código…',
        defaultSort: { id: 'name', direction: 'asc' },
        defaultPageSize: 25,

        columns: [
          {
            id: 'code',
            header: 'Código',
            sortable: true,
            className: 'font-mono text-xs',
            cell: (row) => row.code,
            exportValue: (row) => row.code,
          },
          {
            id: 'name',
            header: 'Nombre',
            sortable: true,
            cell: (row) => <span className="font-medium">{row.name}</span>,
            exportValue: (row) => row.name,
          },
          {
            id: 'countryCode',
            header: 'País',
            sortable: true,
            cell: (row) => row.countryCode,
            exportValue: (row) => row.countryCode,
          },
          {
            id: 'currency',
            header: 'Moneda',
            sortable: true,
            cell: (row) => <span className="font-mono text-xs">{row.currency}</span>,
            exportValue: (row) => row.currency,
          },
          {
            id: 'timezone',
            header: 'Zona horaria',
            sortable: true,
            cell: (row) => <span className="text-xs text-ink-muted">{row.timezone}</span>,
            exportValue: (row) => row.timezone,
          },
          {
            id: 'taxRegime',
            header: 'Régimen fiscal',
            defaultHidden: true,
            cell: (row) => <span className="font-mono text-xs">{row.taxRegime}</span>,
            exportValue: (row) => row.taxRegime,
          },
          {
            id: 'locale',
            header: 'Idioma',
            defaultHidden: true,
            cell: (row) => <span className="font-mono text-xs">{row.locale}</span>,
            exportValue: (row) => row.locale,
          },
          {
            id: 'isLive',
            header: 'Estado',
            sortable: true,
            cell: (row) =>
              row.isLive ? (
                <Badge tone="positive" dot>
                  Activo
                </Badge>
              ) : (
                <Badge tone="neutral">Pre-lanzamiento</Badge>
              ),
            exportValue: (row) => (row.isLive ? 'activo' : 'pre-lanzamiento'),
          },
          {
            id: 'launchedAt',
            header: 'Lanzamiento',
            sortable: true,
            cell: (row) =>
              row.launchedAt ? (
                <DateTime value={row.launchedAt} timeZone={row.timezone} display="date" />
              ) : (
                <span className="text-ink-subtle">—</span>
              ),
            exportValue: (row) => row.launchedAt ?? '',
          },
        ],

        filters: [
          {
            id: 'countryCode',
            type: 'select',
            label: 'País',
            allLabel: 'Todos los países',
            options: [
              { value: 'MX', label: 'México' },
              { value: 'CO', label: 'Colombia' },
              { value: 'CL', label: 'Chile' },
              { value: 'PE', label: 'Perú' },
              { value: 'AR', label: 'Argentina' },
              { value: 'BR', label: 'Brasil' },
              { value: 'CR', label: 'Costa Rica' },
              { value: 'GT', label: 'Guatemala' },
              { value: 'US', label: 'Estados Unidos' },
              { value: 'ES', label: 'España' },
            ],
          },
          {
            id: 'isLive',
            type: 'boolean',
            label: 'Estado',
            trueLabel: 'Activos',
            falseLabel: 'Pre-lanzamiento',
          },
        ],

        fetch: (query) =>
          queryCollection(listMarkets(), query, {
            searchFields: (row) => [row.name, row.code, row.timezone],
            sortValues: (row) => ({
              code: row.code,
              name: row.name,
              countryCode: row.countryCode,
              currency: row.currency,
              timezone: row.timezone,
              isLive: row.isLive,
              launchedAt: row.launchedAt,
            }),
            filterValues: (row) => ({
              countryCode: row.countryCode,
              isLive: String(row.isLive),
            }),
          }),

        toolbar: (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            leadingIcon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            Nuevo mercado
          </Button>
        ),

        rowActions: [
          {
            id: 'edit',
            label: 'Editar',
            icon: <Pencil aria-hidden="true" className="size-3.5" />,
            permission: 'platform.manage',
            run: (row) => {
              setEditing(row)
              setDrawerOpen(true)
            },
          },
          {
            id: 'activate',
            label: 'Activar mercado',
            icon: <Play aria-hidden="true" className="size-3.5" />,
            permission: 'platform.manage',
            hidden: (row) => row.isLive,
            confirm: {
              title: 'Activar mercado',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> empezará a recibir pedidos.
                </>
              ),
              consequence: () =>
                'Verifica que existan zonas de cobertura, tarifas y comisiones antes de activar.',
              confirmLabel: 'Activar',
            },
            run: (row) => {
              setMarketLive(row.id, true)
            },
          },
          {
            id: 'pause',
            label: 'Pausar mercado',
            icon: <Pause aria-hidden="true" className="size-3.5" />,
            permission: 'platform.manage',
            hidden: (row) => !row.isLive,
            tone: 'danger',
            confirm: {
              title: 'Pausar mercado',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> dejará de aceptar pedidos nuevos
                  de inmediato.
                </>
              ),
              consequence: () =>
                'Los pedidos en curso continúan. Los comercios del mercado dejan de ser visibles.',
              confirmLabel: 'Pausar mercado',
              requireReason: true,
            },
            run: (row) => {
              setMarketLive(row.id, false)
            },
          },
          {
            id: 'delete',
            label: 'Eliminar',
            icon: <Trash2 aria-hidden="true" className="size-3.5" />,
            permission: 'platform.manage',
            tone: 'danger',
            // A live market has traffic, zones and settlements attached to it.
            disabled: (row) => (row.isLive ? 'Pausa el mercado antes de eliminarlo.' : false),
            confirm: {
              title: 'Eliminar mercado',
              description: (row) => (
                <>
                  Se eliminará <strong className="text-ink">{row.name}</strong> y su configuración
                  de zonas y tarifas.
                </>
              ),
              consequence: () => 'Esta acción no se puede deshacer.',
              confirmLabel: 'Eliminar definitivamente',
              // Typed confirmation: forces the operator to read which row they
              // are about to destroy.
              typedConfirmation: (row) => row.code,
              requireReason: true,
            },
            run: (row) => {
              deleteMarket(row.id)
            },
          },
        ],

        emptyTitle: 'Aún no hay mercados',
        emptyDescription: 'Crea el primer mercado para empezar a configurar zonas y tarifas.',
      }),
    [],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <MarketFormDrawer
        open={drawerOpen}
        market={editing}
        onClose={() => {
          setDrawerOpen(false)
        }}
        onSaved={refresh}
      />
    </>
  )
}
