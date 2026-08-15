import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCw, SearchX } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { useSession } from '@/app/session-context'
import { PageHeader } from '@/components/shell/PageHeader'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  SkeletonTable,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableWrapper,
} from '@/components/ui'
import { FilterBar } from '@/framework/FilterBar'
import { Pagination } from '@/framework/Pagination'
import { RowActions } from '@/framework/RowActions'
import { buildCsv, downloadCsv, timestampedFilename } from '@/framework/exportCsv'
import { SYNC_EXPORT_LIMIT, type ResourceConfig } from '@/framework/types'
import { useResourceState } from '@/framework/useResourceState'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { cn } from '@/lib/cn'

/**
 * Renders a complete list screen from a resource definition.
 *
 * Covers the four states every list needs - loading, error, nothing exists
 * yet, and nothing matches the filters - so no screen has to remember them.
 */
export function ResourceListPage<TRow>({ config }: { config: ResourceConfig<TRow> }) {
  const { can } = useSession()

  const filters = useMemo(() => config.filters ?? [], [config.filters])

  const state = useResourceState({
    filters,
    ...(config.defaultSort ? { defaultSort: config.defaultSort } : {}),
    ...(config.defaultPageSize ? { defaultPageSize: config.defaultPageSize } : {}),
  })

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set(config.columns.filter((column) => column.defaultHidden).map((c) => c.id)),
  )
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  const query = useQuery({
    queryKey: [config.key, state.query],
    queryFn: () => config.fetch(state.query),
  })

  const toggleColumn = useCallback((columnId: string) => {
    setHiddenColumns((previous) => {
      const next = new Set(previous)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  const visibleColumns = config.columns.filter((column) => !hiddenColumns.has(column.id))
  const exportable = config.exportable !== false
  const actions = config.rowActions ?? []

  const onExport = useCallback(async () => {
    const total = query.data?.total ?? 0

    // A browser building a huge CSV inside a click handler locks the tab, so
    // beyond the threshold this becomes a queued job. Say so rather than
    // silently truncating - a short file that looks complete is worse.
    if (total > SYNC_EXPORT_LIMIT) {
      setExportNotice(
        `La exportación de ${total.toLocaleString('es-MX')} filas se procesará como tarea en segundo plano y llegará por correo. Disponible cuando exista el backend.`,
      )
      return
    }

    setExporting(true)
    setExportNotice(null)

    try {
      // Export what the filters describe, not just the visible page.
      const all = await config.fetch({ ...state.query, page: 1, pageSize: total || 1 })
      downloadCsv(timestampedFilename(config.key), buildCsv(all.rows, config.columns))
    } finally {
      setExporting(false)
    }
  }, [config, state.query, query.data?.total])

  if (!can(config.permission)) {
    return <ForbiddenPage permission={config.permission} />
  }

  const rows = query.data?.rows ?? []
  const total = query.data?.total ?? 0

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <PageHeader
        title={config.title}
        {...(config.description ? { description: config.description } : {})}
        {...(config.toolbar ? { actions: config.toolbar } : {})}
      />

      {exportNotice ? (
        <Alert tone="info" className="mt-4">
          {exportNotice}
        </Alert>
      ) : null}

      <Card className="mt-5">
        <FilterBar
          query={state.query}
          filters={filters}
          searchPlaceholder={config.searchPlaceholder ?? 'Buscar…'}
          columns={config.columns}
          hiddenColumns={hiddenColumns}
          onToggleColumn={toggleColumn}
          isFiltered={state.isFiltered}
          exportable={exportable}
          exporting={exporting}
          onSearch={state.setSearch}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          onExport={() => void onExport()}
        />

        {query.isPending ? (
          <SkeletonTable rows={8} columns={Math.min(visibleColumns.length, 6)} />
        ) : query.isError ? (
          <EmptyState
            title="No se pudieron cargar los datos"
            description={query.error instanceof Error ? query.error.message : 'Error desconocido.'}
            action={
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<RotateCw aria-hidden="true" className="size-3.5" />}
                onClick={() => void query.refetch()}
              >
                Reintentar
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          state.isFiltered ? (
            <EmptyState
              icon={<SearchX aria-hidden="true" className="size-7" />}
              title="Sin coincidencias"
              description="Ningún registro coincide con los filtros actuales."
              action={
                <Button variant="secondary" size="sm" onClick={state.clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={config.emptyTitle ?? 'Aún no hay registros'}
              {...(config.emptyDescription ? { description: config.emptyDescription } : {})}
              {...(config.toolbar ? { action: config.toolbar } : {})}
            />
          )
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <TR>
                  {visibleColumns.map((column) => {
                    const active = state.query.sort === column.id
                    const Icon = !active
                      ? ArrowUpDown
                      : state.query.direction === 'asc'
                        ? ArrowUp
                        : ArrowDown

                    return (
                      <TH
                        key={column.id}
                        numeric={column.numeric ?? false}
                        aria-sort={
                          active
                            ? state.query.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            onClick={() => {
                              state.toggleSort(column.id)
                            }}
                            className={cn(
                              'inline-flex items-center gap-1 rounded transition-colors hover:text-ink',
                              column.numeric && 'flex-row-reverse',
                              active && 'text-ink',
                            )}
                          >
                            {column.header}
                            <Icon aria-hidden="true" className="size-3" />
                          </button>
                        ) : (
                          column.header
                        )}
                      </TH>
                    )
                  })}
                  {actions.length > 0 ? (
                    <TH className="w-10">
                      <span className="sr-only">Acciones</span>
                    </TH>
                  ) : null}
                </TR>
              </THead>

              <TBody>
                {rows.map((row) => (
                  <TR
                    key={config.getRowId(row)}
                    interactive={config.onRowClick !== undefined}
                    {...(config.onRowClick
                      ? {
                          onClick: () => {
                            config.onRowClick?.(row)
                          },
                        }
                      : {})}
                  >
                    {visibleColumns.map((column) => (
                      <TD
                        key={column.id}
                        numeric={column.numeric ?? false}
                        {...(column.className ? { className: column.className } : {})}
                      >
                        {column.cell(row)}
                      </TD>
                    ))}

                    {actions.length > 0 ? (
                      <TD className="text-right">
                        <RowActions
                          row={row}
                          actions={actions}
                          onCompleted={() => void query.refetch()}
                        />
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrapper>
        )}

        {!query.isPending && !query.isError && rows.length > 0 ? (
          <Pagination
            page={state.query.page}
            pageSize={state.query.pageSize}
            total={total}
            onPage={state.setPage}
            onPageSize={state.setPageSize}
          />
        ) : null}
      </Card>
    </div>
  )
}
