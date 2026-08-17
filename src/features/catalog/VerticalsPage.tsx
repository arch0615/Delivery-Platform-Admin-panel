import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Field,
  FormRow,
  Input,
  Select,
} from '@/components/ui'
import { ResourceListPage, defineResource } from '@/framework'
import {
  listVerticals,
  setVerticalActive,
  upsertVertical,
  type FulfillmentModel,
  type Vertical,
} from '@/lib/catalog'
import { queryCollection } from '@/lib/mock-api'

/*
 * A-016 Verticals.
 *
 * A vertical decides how an order behaves, not just how it is labelled: age
 * gates, licence checks, prescription handling, substitution rules and the
 * fulfilment model all hang off these flags.
 */

const RESOURCE_KEY = 'verticals'

export function VerticalsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Vertical | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [RESOURCE_KEY] })
  }

  const config = useMemo(
    () =>
      defineResource<Vertical>({
        key: RESOURCE_KEY,
        title: 'Verticales',
        description:
          'Cada vertical define el modelo de cumplimiento y las reglas de edad, licencia y sustitución.',
        permission: 'catalog.view',
        getRowId: (row) => row.id,
        searchPlaceholder: 'Buscar vertical…',
        defaultSort: { id: 'sortOrder', direction: 'asc' },
        exportable: false,

        columns: [
          {
            id: 'sortOrder',
            header: 'Orden',
            numeric: true,
            sortable: true,
            cell: (row) => row.sortOrder,
          },
          {
            id: 'name',
            header: 'Vertical',
            sortable: true,
            cell: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            id: 'code',
            header: 'Código',
            sortable: true,
            className: 'font-mono text-xs',
            cell: (row) => row.code,
          },
          {
            id: 'fulfillmentModel',
            header: 'Cumplimiento',
            sortable: true,
            cell: (row) =>
              row.fulfillmentModel === 'first_party' ? (
                <Badge tone="accent">Propio</Badge>
              ) : (
                <Badge tone="neutral">Marketplace</Badge>
              ),
          },
          {
            id: 'rules',
            header: 'Reglas',
            cell: (row) => (
              <span className="flex flex-wrap gap-1">
                {row.isAgeRestricted ? (
                  <Badge tone="warning">Edad {row.minAge ?? '?'}+</Badge>
                ) : null}
                {row.requiresLicense ? <Badge tone="warning">Licencia</Badge> : null}
                {row.requiresPrescription ? <Badge tone="danger">Receta</Badge> : null}
                {row.supportsSubstitution ? <Badge tone="info">Sustituciones</Badge> : null}
                {!row.isAgeRestricted &&
                !row.requiresLicense &&
                !row.requiresPrescription &&
                !row.supportsSubstitution ? (
                  <span className="text-ink-subtle">—</span>
                ) : null}
              </span>
            ),
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
          },
        ],

        filters: [
          {
            id: 'fulfillmentModel',
            type: 'select',
            label: 'Cumplimiento',
            allLabel: 'Todos los modelos',
            options: [
              { value: 'marketplace', label: 'Marketplace' },
              { value: 'first_party', label: 'Operación propia' },
            ],
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
          queryCollection(listVerticals(), query, {
            searchFields: (row) => [row.name, row.code],
            sortValues: (row) => ({
              sortOrder: row.sortOrder,
              name: row.name,
              code: row.code,
              fulfillmentModel: row.fulfillmentModel,
              isActive: row.isActive,
            }),
            filterValues: (row) => ({
              fulfillmentModel: row.fulfillmentModel,
              isActive: String(row.isActive),
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
            Nueva vertical
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
            id: 'activate',
            label: 'Activar vertical',
            icon: <Power aria-hidden="true" className="size-3.5" />,
            permission: 'catalog.manage',
            hidden: (row) => row.isActive,
            confirm: {
              title: 'Activar vertical',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> será visible para los clientes en
                  los mercados activos.
                </>
              ),
              // Turning on a regulated vertical is a compliance decision, not a
              // configuration change. Say so before it happens.
              consequence: (row) =>
                row.requiresPrescription
                  ? 'Esta vertical requiere receta médica. No la actives sin carga de receta, validación de farmacéutico y el registro de medicamentos controlados (COFEPRIS).'
                  : row.requiresLicense
                    ? 'Esta vertical requiere licencia vigente por región y horarios de venta configurados antes de operar.'
                    : 'Verifica que existan comercios y categorías antes de activarla.',
              confirmLabel: 'Activar',
              requireReason: true,
            },
            run: (row) => {
              setVerticalActive(row.id, true)
            },
          },
          {
            id: 'deactivate',
            label: 'Desactivar vertical',
            icon: <PowerOff aria-hidden="true" className="size-3.5" />,
            permission: 'catalog.manage',
            hidden: (row) => !row.isActive,
            tone: 'danger',
            confirm: {
              title: 'Desactivar vertical',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> dejará de aparecer en la
                  aplicación.
                </>
              ),
              consequence: () =>
                'Los comercios y categorías de esta vertical quedan ocultos. Los pedidos en curso continúan.',
              confirmLabel: 'Desactivar',
              typedConfirmation: (row) => row.code,
              requireReason: true,
            },
            run: (row) => {
              setVerticalActive(row.id, false)
            },
          },
        ],
      }),
    [],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <Drawer
        open={drawerOpen}
        title={editing ? `Editar ${editing.name}` : 'Nueva vertical'}
        description="Los indicadores determinan el comportamiento del pedido, no solo la etiqueta."
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
            <Button variant="primary" type="submit" form="vertical-form">
              {editing ? 'Guardar cambios' : 'Crear vertical'}
            </Button>
          </>
        }
      >
        {drawerOpen ? (
          <VerticalForm
            key={editing?.id ?? 'new'}
            vertical={editing}
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

const EMPTY: Omit<Vertical, 'id'> = {
  code: '',
  name: '',
  fulfillmentModel: 'marketplace',
  isAgeRestricted: false,
  minAge: null,
  requiresPrescription: false,
  requiresLicense: false,
  supportsSubstitution: false,
  sortOrder: 100,
  isActive: false,
}

function VerticalForm({
  vertical,
  onSaved,
  onClose,
}: {
  vertical: Vertical | null
  onSaved: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState(() => (vertical ? { ...vertical } : EMPTY))
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (form.code.trim() === '' || form.name.trim() === '') {
      setError('El código y el nombre son obligatorios.')
      return
    }
    if (form.isAgeRestricted && (form.minAge === null || form.minAge < 1)) {
      setError('Una vertical con restricción de edad necesita una edad mínima.')
      return
    }

    upsertVertical({
      ...form,
      id: vertical?.id ?? `v-${form.code.trim().toLowerCase()}`,
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      // Age is meaningless without the restriction, so keep them consistent.
      minAge: form.isAgeRestricted ? form.minAge : null,
    })

    onSaved()
    onClose()
  }

  return (
    <form id="vertical-form" onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <FormRow>
        <Field label="Código" required hint="Identificador estable, en minúsculas.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={form.code}
              onChange={(event) => {
                update('code', event.target.value)
              }}
              placeholder="grocery"
              className="font-mono"
              disabled={vertical !== null}
            />
          )}
        </Field>

        <Field label="Orden" hint="Posición en la app.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              aria-describedby={describedBy}
              value={form.sortOrder}
              onChange={(event) => {
                update('sortOrder', Number(event.target.value))
              }}
            />
          )}
        </Field>
      </FormRow>

      <Field label="Nombre" required>
        {({ id }) => (
          <Input
            id={id}
            value={form.name}
            onChange={(event) => {
              update('name', event.target.value)
            }}
            placeholder="Súper"
          />
        )}
      </Field>

      <Field
        label="Modelo de cumplimiento"
        required
        hint="La operación propia usa inventario y repartidores de la empresa."
      >
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={form.fulfillmentModel}
            onChange={(event) => {
              update('fulfillmentModel', event.target.value as FulfillmentModel)
            }}
          >
            <option value="marketplace">Marketplace</option>
            <option value="first_party">Operación propia</option>
          </Select>
        )}
      </Field>

      <fieldset className="grid gap-2.5 rounded-lg border border-border-base px-3 py-3">
        <legend className="px-1 text-xs font-medium text-ink-muted">Reglas del pedido</legend>

        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox
            checked={form.isAgeRestricted}
            onChange={(event) => {
              update('isAgeRestricted', event.target.checked)
              if (event.target.checked && form.minAge === null) {
                update('minAge', 18)
              }
            }}
          />
          Requiere verificación de edad
        </label>

        {form.isAgeRestricted ? (
          <Field label="Edad mínima" required className="ml-6">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={form.minAge ?? 18}
                onChange={(event) => {
                  update('minAge', Number(event.target.value))
                }}
                className="w-24"
              />
            )}
          </Field>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox
            checked={form.requiresLicense}
            onChange={(event) => {
              update('requiresLicense', event.target.checked)
            }}
          />
          Requiere licencia por región
        </label>

        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox
            checked={form.requiresPrescription}
            onChange={(event) => {
              update('requiresPrescription', event.target.checked)
            }}
          />
          Requiere receta médica
        </label>

        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox
            checked={form.supportsSubstitution}
            onChange={(event) => {
              update('supportsSubstitution', event.target.checked)
            }}
          />
          Permite sustituciones de productos
        </label>
      </fieldset>

      {form.requiresPrescription ? (
        <Alert tone="warning" title="Vertical regulada">
          Los medicamentos están regulados por COFEPRIS. Requiere carga de receta, validación de
          farmacéutico y registro de medicamentos controlados antes de activarse.
        </Alert>
      ) : null}

      <Alert tone="info">
        Una vertical nueva se crea inactiva. Actívala desde la lista cuando tenga categorías y
        comercios.
      </Alert>
    </form>
  )
}
