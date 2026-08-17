import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  IndentIncrease,
  ArrowDown,
  ArrowUp,
  IndentDecrease,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { useSession } from '@/app/session-context'
import { PageHeader } from '@/components/shell/PageHeader'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  Input,
  Select,
  SkeletonTable,
} from '@/components/ui'
import { ConfirmDialog } from '@/framework'
import {
  createCategoryId,
  deleteCategoryTree,
  listCategories,
  listVerticals,
  replaceCategories,
  upsertCategory,
  type Category,
} from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { buildTree, descendantIds, flattenTree, indent, moveSibling, outdent } from '@/lib/tree'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

/*
 * A-017 Category tree.
 *
 * The one taxonomy screen NOT built on the resource framework: it is a
 * hierarchy, not a filterable list, and forcing it into a table of rows would
 * lose the structure that gives it meaning. Per architecture risk AR3 that
 * makes it a deliberate exception rather than a drifting one.
 *
 * Reordering is by button - up, down, indent, outdent - rather than drag and
 * drop. The tree operations in src/lib/tree.ts are the hard part and are fully
 * tested; the buttons are keyboard accessible and a drag gesture can be layered
 * on top later without touching the logic.
 */

const QUERY_KEY = 'categories'

/** Stable reference: `?? []` would allocate a new array on every render and
 *  defeat the memoised tree below. */
const NO_ROWS: Category[] = []

export function CategoriesPage() {
  const { can } = useSession()
  const queryClient = useQueryClient()

  const verticals = listVerticals()
  const [verticalId, setVerticalId] = useState(verticals[0]?.id ?? '')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const [editing, setEditing] = useState<Category | null>(null)
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const query = useQuery({
    queryKey: [QUERY_KEY, verticalId],
    queryFn: () => Promise.resolve(listCategories().filter((row) => row.verticalId === verticalId)),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
  }

  const rows = query.data ?? NO_ROWS
  const editable = can('catalog.manage')

  const visible = useMemo(
    () => flattenTree(buildTree(rows), (id) => collapsed.has(id)),
    [rows, collapsed],
  )

  /** Tree edits rewrite the whole vertical's rows, matching a bulk PATCH. */
  const applyRows = (next: Category[]) => {
    const others = listCategories().filter((row) => row.verticalId !== verticalId)
    replaceCategories([...others, ...next])
    refresh()
  }

  const toggleCollapse = (id: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (!can('catalog.view')) {
    return <ForbiddenPage permission="catalog.view" />
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <PageHeader
        title="Categorías"
        description="Taxonomía de la plataforma, compartida entre comercios. Define navegación y reglas de comisión por categoría."
        actions={
          editable ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAddingUnder(null)
              }}
              leadingIcon={<Plus aria-hidden="true" className="size-3.5" />}
            >
              Nueva categoría raíz
            </Button>
          ) : null
        }
      />

      <Card className="mt-5">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-base px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Vertical
            <Select
              value={verticalId}
              onChange={(event) => {
                setVerticalId(event.target.value)
                setCollapsed(new Set())
              }}
              className="h-8 w-auto min-w-44 text-xs"
            >
              {verticals.map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.name}
                  {vertical.isActive ? '' : ' (inactiva)'}
                </option>
              ))}
            </Select>
          </label>

          <span className="text-xs text-ink-subtle">
            {rows.length} categoría{rows.length === 1 ? '' : 's'}
          </span>
        </div>

        {query.isPending ? (
          <SkeletonTable rows={6} columns={2} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Esta vertical no tiene categorías"
            description="Crea la primera categoría raíz para empezar a construir la taxonomía."
            {...(editable
              ? {
                  action: (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setAddingUnder(null)
                      }}
                    >
                      Nueva categoría raíz
                    </Button>
                  ),
                }
              : {})}
          />
        ) : (
          <ul className="divide-y divide-border-base">
            {visible.map((node) => {
              const { row, depth, children } = node
              const isCollapsed = collapsed.has(row.id)

              return (
                <li
                  key={row.id}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-surface-muted"
                >
                  {/* Indentation carries the hierarchy, so it is generous. */}
                  <span style={{ width: depth * 22 }} aria-hidden="true" className="shrink-0" />

                  {children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        toggleCollapse(row.id)
                      }}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? `Expandir ${row.name}` : `Colapsar ${row.name}`}
                      className="flex size-5 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-sunken hover:text-ink"
                    >
                      {isCollapsed ? (
                        <ChevronRight aria-hidden="true" className="size-3.5" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="size-3.5" />
                      )}
                    </button>
                  ) : (
                    <span aria-hidden="true" className="size-5 shrink-0" />
                  )}

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'text-sm',
                        row.isActive ? 'text-ink' : 'text-ink-subtle line-through',
                        depth === 0 && 'font-medium',
                      )}
                    >
                      {row.name}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-ink-subtle">{row.code}</span>
                  </span>

                  {children.length > 0 ? (
                    <Badge tone="neutral">
                      {children.length} sub{children.length === 1 ? '' : 's'}
                    </Badge>
                  ) : null}

                  {!row.isActive ? <Badge tone="neutral">Inactiva</Badge> : null}

                  {editable ? (
                    <span className="flex shrink-0 items-center gap-0.5">
                      <TreeButton
                        label={`Subir ${row.name}`}
                        onClick={() => {
                          applyRows(moveSibling(rows, row.id, 'up'))
                        }}
                      >
                        <ArrowUp aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                      <TreeButton
                        label={`Bajar ${row.name}`}
                        onClick={() => {
                          applyRows(moveSibling(rows, row.id, 'down'))
                        }}
                      >
                        <ArrowDown aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                      <TreeButton
                        label={`Anidar ${row.name}`}
                        onClick={() => {
                          applyRows(indent(rows, row.id))
                        }}
                      >
                        <IndentIncrease aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                      <TreeButton
                        label={`Promover ${row.name}`}
                        onClick={() => {
                          applyRows(outdent(rows, row.id))
                        }}
                      >
                        <IndentDecrease aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                      <TreeButton
                        label={`Agregar subcategoría en ${row.name}`}
                        onClick={() => {
                          setAddingUnder(row.id)
                        }}
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                      <TreeButton
                        label={`Editar ${row.name}`}
                        onClick={() => {
                          setEditing(row)
                        }}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                      <TreeButton
                        label={`Eliminar ${row.name}`}
                        tone="danger"
                        onClick={() => {
                          setDeleting(row)
                        }}
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </TreeButton>
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-subtle">
        Usa las flechas para ordenar y las sangrías para anidar. Una categoría no puede moverse
        dentro de sí misma.
      </p>

      <Drawer
        open={editing !== null || addingUnder !== undefined}
        title={editing ? `Editar ${editing.name}` : 'Nueva categoría'}
        {...(addingUnder
          ? {
              description: `Se creará dentro de ${listCategories().find((c) => c.id === addingUnder)?.name ?? ''}.`,
            }
          : {})}
        onClose={() => {
          setEditing(null)
          setAddingUnder(undefined)
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null)
                setAddingUnder(undefined)
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="category-form">
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        {editing !== null || addingUnder !== undefined ? (
          <CategoryForm
            key={editing?.id ?? `new-${addingUnder ?? 'root'}`}
            category={editing}
            verticalId={verticalId}
            parentId={editing ? editing.parentId : (addingUnder ?? null)}
            siblingCount={
              rows.filter(
                (row) => row.parentId === (editing ? editing.parentId : (addingUnder ?? null)),
              ).length
            }
            onSaved={refresh}
            onClose={() => {
              setEditing(null)
              setAddingUnder(undefined)
            }}
          />
        ) : null}
      </Drawer>

      {deleting ? (
        <ConfirmDialog
          open
          title="Eliminar categoría"
          tone="danger"
          description={
            <>
              Se eliminará <strong className="text-ink">{deleting.name}</strong>
              {descendantIds(rows, deleting.id).length > 0 ? (
                <> y sus {descendantIds(rows, deleting.id).length} subcategoría(s)</>
              ) : null}
              .
            </>
          }
          consequence="Los productos asignados a estas categorías quedarán sin clasificar, y las reglas de comisión por categoría dejarán de aplicar."
          confirmLabel="Eliminar"
          typedConfirmation={deleting.code}
          requireReason
          onConfirm={() => {
            deleteCategoryTree(deleting.id, descendantIds(rows, deleting.id))
            setDeleting(null)
            refresh()
          }}
          onCancel={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </div>
  )
}

function TreeButton({
  label,
  onClick,
  tone = 'default',
  children,
}: {
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex size-7 items-center justify-center rounded transition-colors',
        tone === 'danger'
          ? 'text-ink-subtle hover:bg-danger-soft hover:text-danger'
          : 'text-ink-subtle hover:bg-surface-sunken hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function CategoryForm({
  category,
  verticalId,
  parentId,
  siblingCount,
  onSaved,
  onClose,
}: {
  category: Category | null
  verticalId: string
  parentId: string | null
  siblingCount: number
  onSaved: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [code, setCode] = useState(category?.code ?? '')
  const [isActive, setIsActive] = useState(category?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedCode = code.trim().toLowerCase()

    if (trimmedName === '' || trimmedCode === '') {
      setError('El nombre y el código son obligatorios.')
      return
    }

    // Code is unique per vertical in the schema, so check before saving rather
    // than letting the API reject it.
    const clash = listCategories().some(
      (row) => row.verticalId === verticalId && row.code === trimmedCode && row.id !== category?.id,
    )
    if (clash) {
      setError('Ya existe una categoría con ese código en esta vertical.')
      return
    }

    upsertCategory({
      id: category?.id ?? createCategoryId(),
      verticalId,
      parentId,
      code: trimmedCode,
      name: trimmedName,
      sortOrder: category?.sortOrder ?? (siblingCount + 1) * 10,
      isActive,
    })

    onSaved()
    onClose()
  }

  return (
    <form id="category-form" onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field label="Nombre" required>
        {({ id }) => (
          <Input
            id={id}
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder="Frutas y verduras"
          />
        )}
      </Field>

      <Field label="Código" required hint="Único dentro de la vertical. Se usa en la URL.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setError(null)
            }}
            placeholder="frutas-verduras"
            className="font-mono"
          />
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox
          checked={isActive}
          onChange={(event) => {
            setIsActive(event.target.checked)
          }}
        />
        Visible para los clientes
      </label>
    </form>
  )
}
