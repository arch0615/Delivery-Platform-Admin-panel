import type { ReactNode } from 'react'

import type { Permission } from '@/lib/permissions'

/*
 * RESOURCE FRAMEWORK - CONTRACT
 *
 * Most admin screens are the same shape: a filterable table, a detail view,
 * and a set of permission-gated actions. Declaring that shape once means the
 * remaining list screens are configuration rather than bespoke pages, and that
 * URL-driven filters, server pagination, export, empty/error states and
 * confirmation dialogs behave identically everywhere.
 *
 * See web architecture.txt §8.5.2 and risk AR3: an admin screen that cannot be
 * expressed here is a design-review trigger, not a new hand-built page.
 */

export type SortDirection = 'asc' | 'desc'

/** Everything the server needs to answer a list request. */
export type ResourceQuery = {
  page: number
  pageSize: number
  sort: string | null
  direction: SortDirection
  search: string
  /** Values keyed by filter id. Empty string means "not applied". */
  filters: Record<string, string>
}

export type ResourcePage<TRow> = {
  rows: TRow[]
  total: number
}

export type ColumnDef<TRow> = {
  id: string
  header: string
  /** What to render in the cell. */
  cell: (row: TRow) => ReactNode
  sortable?: boolean
  /** Right-aligns and applies tabular figures - use for money and counts. */
  numeric?: boolean
  /** Hidden until the viewer turns it on in the column menu. */
  defaultHidden?: boolean
  /**
   * Plain value for CSV. Falls back to nothing if absent, because a rendered
   * cell can be a badge or an icon and must not be stringified blindly.
   */
  exportValue?: (row: TRow) => string | number | null
  className?: string
}

export type FilterOption = {
  value: string
  label: string
}

export type FilterDef =
  | { id: string; type: 'select'; label: string; options: FilterOption[]; allLabel?: string }
  | { id: string; type: 'boolean'; label: string; trueLabel?: string; falseLabel?: string }

/**
 * Confirmation requirements for an action.
 *
 * `typedConfirmation` forces the operator to type an exact string before a
 * destructive action proceeds. Every financial or irreversible action uses it.
 */
export type ActionConfirm<TRow> = {
  title: string
  description: (row: TRow) => ReactNode
  confirmLabel: string
  /** Consequence stated plainly before the action is taken. */
  consequence?: (row: TRow) => ReactNode
  typedConfirmation?: (row: TRow) => string
  requireReason?: boolean
}

export type ActionDef<TRow> = {
  id: string
  label: string
  icon?: ReactNode
  /** Hidden entirely when the viewer lacks it. */
  permission?: Permission
  tone?: 'default' | 'danger'
  /** Row-specific availability, e.g. only approve a pending merchant. */
  hidden?: (row: TRow) => boolean
  disabled?: (row: TRow) => string | false
  confirm?: ActionConfirm<TRow>
  run: (row: TRow, context: { reason: string }) => Promise<void> | void
}

export type ResourceConfig<TRow> = {
  /** Query-cache key and URL namespace. */
  key: string
  title: string
  description?: string
  /** Required to open the screen at all. */
  permission: Permission

  getRowId: (row: TRow) => string
  columns: ColumnDef<TRow>[]
  filters?: FilterDef[]
  searchPlaceholder?: string
  defaultSort?: { id: string; direction: SortDirection }
  defaultPageSize?: number

  fetch: (query: ResourceQuery) => Promise<ResourcePage<TRow>>

  rowActions?: ActionDef<TRow>[]
  /** Buttons rendered beside the title, e.g. "New market". */
  toolbar?: ReactNode
  onRowClick?: (row: TRow) => void

  /** Export is on by default; set false where the data must not leave. */
  exportable?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Rows above this go through a queued export job rather than a synchronous
 * download - a browser building a 50k-row CSV in a click handler locks up.
 */
export const SYNC_EXPORT_LIMIT = 5000
