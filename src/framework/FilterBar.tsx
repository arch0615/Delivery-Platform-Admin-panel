import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Columns3, Download, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button, Input, Select } from '@/components/ui'
import type { ColumnDef, FilterDef, ResourceQuery } from '@/framework/types'
import { cn } from '@/lib/cn'

export type FilterBarProps<TRow> = {
  query: ResourceQuery
  filters: FilterDef[]
  searchPlaceholder: string
  columns: ColumnDef<TRow>[]
  hiddenColumns: Set<string>
  onToggleColumn: (columnId: string) => void
  isFiltered: boolean
  exportable: boolean
  exporting: boolean
  onSearch: (value: string) => void
  onFilter: (filterId: string, value: string) => void
  onClear: () => void
  onExport: () => void
}

export function FilterBar<TRow>({
  query,
  filters,
  searchPlaceholder,
  columns,
  hiddenColumns,
  onToggleColumn,
  isFiltered,
  exportable,
  exporting,
  onSearch,
  onFilter,
  onClear,
  onExport,
}: FilterBarProps<TRow>) {
  const [draft, setDraft] = useState(query.search)
  const [lastAppliedSearch, setLastAppliedSearch] = useState(query.search)

  // Keep the box in step when the URL changes from elsewhere - back button, a
  // shared link, or "clear filters". Adjusting during render rather than in an
  // effect avoids a second render pass showing the stale value first.
  if (query.search !== lastAppliedSearch) {
    setLastAppliedSearch(query.search)
    setDraft(query.search)
  }

  // Debounced so typing does not push a history entry per keystroke.
  useEffect(() => {
    if (draft === query.search) {
      return
    }

    const timer = window.setTimeout(() => {
      onSearch(draft)
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [draft, query.search, onSearch])

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-base px-4 py-3">
      <div className="relative min-w-56 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-subtle"
        />
        <Input
          type="search"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {filters.map((filter) => (
        <label key={filter.id} className="flex items-center gap-1.5">
          <span className="sr-only">{filter.label}</span>
          <Select
            value={query.filters[filter.id] ?? ''}
            onChange={(event) => {
              onFilter(filter.id, event.target.value)
            }}
            className="h-8 w-auto min-w-36 text-xs"
          >
            {filter.type === 'select' ? (
              <>
                <option value="">{filter.allLabel ?? `${filter.label}: todos`}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="">{`${filter.label}: todos`}</option>
                <option value="true">{filter.trueLabel ?? 'Sí'}</option>
                <option value="false">{filter.falseLabel ?? 'No'}</option>
              </>
            )}
          </Select>
        </label>
      ))}

      {isFiltered ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          leadingIcon={<X aria-hidden="true" className="size-3.5" />}
        >
          Limpiar
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<Columns3 aria-hidden="true" className="size-3.5" />}
            >
              Columnas
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-48 rounded-lg border border-border-base bg-surface p-1 shadow-raised"
            >
              {columns.map((column) => {
                const visible = !hiddenColumns.has(column.id)

                return (
                  <DropdownMenu.CheckboxItem
                    key={column.id}
                    checked={visible}
                    onSelect={(event) => {
                      // Keep the menu open so several columns can be toggled.
                      event.preventDefault()
                      onToggleColumn(column.id)
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink outline-hidden data-highlighted:bg-surface-sunken"
                  >
                    <Check
                      aria-hidden="true"
                      className={cn('size-3.5 text-accent', visible ? 'opacity-100' : 'opacity-0')}
                    />
                    {column.header}
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {exportable ? (
          <Button
            size="sm"
            variant="secondary"
            loading={exporting}
            onClick={onExport}
            leadingIcon={<Download aria-hidden="true" className="size-3.5" />}
          >
            Exportar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
