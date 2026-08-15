import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button, Select } from '@/components/ui'
import { PAGE_SIZE_OPTIONS } from '@/framework/useResourceState'
import { formatNumber } from '@/lib/format'

export type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize: (pageSize: number) => void
}

export function Pagination({ page, pageSize, total, onPage, onPageSize }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base px-4 py-3">
      <p className="text-xs text-ink-muted">
        {total === 0 ? (
          'Sin resultados'
        ) : (
          <>
            <span className="tabular">
              {formatNumber(first)}–{formatNumber(last)}
            </span>{' '}
            de <span className="tabular font-medium text-ink">{formatNumber(total)}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          Por página
          <Select
            value={String(pageSize)}
            onChange={(event) => {
              onPageSize(Number(event.target.value))
            }}
            className="h-8 w-auto text-xs"
            aria-label="Resultados por página"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => {
              onPage(page - 1)
            }}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
          </Button>

          <span className="tabular px-1 text-xs text-ink-muted">
            {page} / {pageCount}
          </span>

          <Button
            size="sm"
            variant="secondary"
            disabled={page >= pageCount}
            onClick={() => {
              onPage(page + 1)
            }}
            aria-label="Página siguiente"
          >
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
