import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import {
  Alert,
  Badge,
  Button,
  DateTime,
  Drawer,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { ResourceListPage, defineResource } from '@/framework'
import {
  createRestrictedItemId,
  deleteRestrictedItem,
  findVertical,
  listRestrictedItems,
  listVerticals,
  upsertRestrictedItem,
  type RestrictedItem,
  type RestrictedMatchType,
} from '@/lib/catalog'
import { queryCollection } from '@/lib/mock-api'

/*
 * A-018 Restricted items.
 *
 * A blocklist of things that may never be sold, checked when a merchant
 * publishes a product. Essential the moment the pharmacy vertical is in scope,
 * and already useful for items prohibited outright.
 *
 * Note which direction is dangerous here: adding a restriction is safe, while
 * REMOVING one re-permits a banned product. Deletion therefore carries the
 * typed confirmation, not creation.
 */

const RESOURCE_KEY = 'restricted-items'

const MATCH_LABELS: Record<RestrictedMatchType, string> = {
  sku: 'SKU',
  keyword: 'Palabra clave',
  category: 'Categoría',
}

export function RestrictedItemsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<RestrictedItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [RESOURCE_KEY] })
  }

  const config = useMemo(
    () =>
      defineResource<RestrictedItem>({
        key: RESOURCE_KEY,
        title: 'Artículos restringidos',
        description:
          'Coincidencias que nunca pueden publicarse. Se evalúan cuando un comercio da de alta un producto.',
        permission: 'catalog.view',
        getRowId: (row) => row.id,
        searchPlaceholder: 'Buscar por valor o motivo…',
        defaultSort: { id: 'createdAt', direction: 'desc' },

        columns: [
          {
            id: 'matchType',
            header: 'Tipo',
            sortable: true,
            cell: (row) => <Badge tone="neutral">{MATCH_LABELS[row.matchType]}</Badge>,
            exportValue: (row) => row.matchType,
          },
          {
            id: 'matchValue',
            header: 'Coincidencia',
            sortable: true,
            cell: (row) => <span className="font-mono text-xs font-medium">{row.matchValue}</span>,
            exportValue: (row) => row.matchValue,
          },
          {
            id: 'vertical',
            header: 'Vertical',
            sortable: true,
            cell: (row) =>
              row.verticalId ? (
                <span className="text-xs">
                  {findVertical(row.verticalId)?.name ?? row.verticalId}
                </span>
              ) : (
                <span className="text-xs text-ink-subtle">Todas</span>
              ),
            exportValue: (row) =>
              row.verticalId ? (findVertical(row.verticalId)?.code ?? row.verticalId) : 'todas',
          },
          {
            id: 'reason',
            header: 'Motivo',
            cell: (row) => <span className="text-xs text-ink-muted">{row.reason}</span>,
            exportValue: (row) => row.reason,
          },
          {
            id: 'createdAt',
            header: 'Registrado',
            sortable: true,
            cell: (row) => <DateTime value={row.createdAt} display="date" />,
            exportValue: (row) => row.createdAt,
          },
        ],

        filters: [
          {
            id: 'matchType',
            type: 'select',
            label: 'Tipo',
            allLabel: 'Todos los tipos',
            options: [
              { value: 'keyword', label: 'Palabra clave' },
              { value: 'sku', label: 'SKU' },
              { value: 'category', label: 'Categoría' },
            ],
          },
          {
            id: 'verticalId',
            type: 'select',
            label: 'Vertical',
            allLabel: 'Todas las verticales',
            options: listVerticals().map((vertical) => ({
              value: vertical.id,
              label: vertical.name,
            })),
          },
        ],

        fetch: (query) =>
          queryCollection(listRestrictedItems(), query, {
            searchFields: (row) => [row.matchValue, row.reason],
            sortValues: (row) => ({
              matchType: row.matchType,
              matchValue: row.matchValue,
              vertical: row.verticalId ?? '',
              createdAt: row.createdAt,
            }),
            filterValues: (row) => ({
              matchType: row.matchType,
              verticalId: row.verticalId ?? '',
            }),
          }),

        toolbar: (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null)
              setDrawerOpen(true)
            }}
            leadingIcon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            Nueva restricción
          </Button>
        ),

        rowActions: [
          {
            id: 'edit',
            label: 'Editar',
            icon: <Pencil aria-hidden="true" className="size-3.5" />,
            permission: 'catalog.manage',
            run: (row) => {
              setEditing(row)
              setDrawerOpen(true)
            },
          },
          {
            id: 'delete',
            label: 'Eliminar restricción',
            icon: <Trash2 aria-hidden="true" className="size-3.5" />,
            permission: 'catalog.manage',
            tone: 'danger',
            confirm: {
              title: 'Eliminar restricción',
              description: (row) => (
                <>
                  Se permitirá de nuevo la publicación de{' '}
                  <strong className="text-ink">{row.matchValue}</strong>.
                </>
              ),
              // Removing a restriction re-permits a banned product, which is
              // the direction that carries risk.
              consequence: (row) => `Motivo registrado: ${row.reason}`,
              confirmLabel: 'Eliminar restricción',
              typedConfirmation: (row) => row.matchValue,
              requireReason: true,
            },
            run: (row) => {
              deleteRestrictedItem(row.id)
            },
          },
        ],

        emptyTitle: 'Sin restricciones registradas',
        emptyDescription:
          'Agrega la primera coincidencia para bloquear artículos que no pueden venderse.',
      }),
    [],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <Drawer
        open={drawerOpen}
        title={editing ? 'Editar restricción' : 'Nueva restricción'}
        description="Se evalúa al publicar un producto, antes de que quede visible."
        onClose={() => {
          setDrawerOpen(false)
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDrawerOpen(false)
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="restricted-form">
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        {drawerOpen ? (
          <RestrictedForm
            key={editing?.id ?? 'new'}
            item={editing}
            onSaved={refresh}
            onClose={() => {
              setDrawerOpen(false)
            }}
          />
        ) : null}
      </Drawer>
    </>
  )
}

function RestrictedForm({
  item,
  onSaved,
  onClose,
}: {
  item: RestrictedItem | null
  onSaved: () => void
  onClose: () => void
}) {
  const [matchType, setMatchType] = useState<RestrictedMatchType>(item?.matchType ?? 'keyword')
  const [matchValue, setMatchValue] = useState(item?.matchValue ?? '')
  const [verticalId, setVerticalId] = useState(item?.verticalId ?? '')
  const [reason, setReason] = useState(item?.reason ?? '')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (matchValue.trim() === '') {
      setError('Escribe el valor a bloquear.')
      return
    }
    if (reason.trim().length < 5) {
      // The reason is what a merchant sees when their product is rejected, so
      // it cannot be blank.
      setError('El motivo es obligatorio: es lo que verá el comercio.')
      return
    }

    upsertRestrictedItem({
      id: item?.id ?? createRestrictedItemId(),
      marketId: null,
      verticalId: verticalId === '' ? null : verticalId,
      matchType,
      matchValue: matchValue.trim(),
      reason: reason.trim(),
      createdAt: item?.createdAt ?? new Date().toISOString(),
    })

    onSaved()
    onClose()
  }

  return (
    <form id="restricted-form" onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field label="Tipo de coincidencia" required>
        {({ id }) => (
          <Select
            id={id}
            value={matchType}
            onChange={(event) => {
              setMatchType(event.target.value as RestrictedMatchType)
            }}
          >
            <option value="keyword">Palabra clave en el nombre</option>
            <option value="sku">SKU exacto</option>
            <option value="category">Código de categoría</option>
          </Select>
        )}
      </Field>

      <Field
        label="Valor"
        required
        hint={
          matchType === 'keyword'
            ? 'Coincide si aparece en el nombre del producto.'
            : matchType === 'sku'
              ? 'Coincidencia exacta del SKU.'
              : 'Código de la categoría bloqueada.'
        }
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            autoFocus
            aria-describedby={describedBy}
            value={matchValue}
            onChange={(event) => {
              setMatchValue(event.target.value)
              setError(null)
            }}
            placeholder={matchType === 'keyword' ? 'tabaco' : 'medicamentos'}
            className="font-mono"
          />
        )}
      </Field>

      <Field label="Vertical" hint="Déjalo en blanco para aplicar a todas.">
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={verticalId}
            onChange={(event) => {
              setVerticalId(event.target.value)
            }}
          >
            <option value="">Todas las verticales</option>
            {listVerticals().map((vertical) => (
              <option key={vertical.id} value={vertical.id}>
                {vertical.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Motivo" required hint="Se muestra al comercio cuando se rechaza el producto.">
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            placeholder="Venta no permitida por regulación."
          />
        )}
      </Field>
    </form>
  )
}
