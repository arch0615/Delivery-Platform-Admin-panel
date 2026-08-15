export { ConfirmDialog, type ConfirmDialogProps } from '@/framework/ConfirmDialog'
export { ResourceListPage } from '@/framework/ResourceListPage'
export { RowActions } from '@/framework/RowActions'
export { buildCsv, downloadCsv, escapeCsvValue, timestampedFilename } from '@/framework/exportCsv'
export {
  SYNC_EXPORT_LIMIT,
  type ActionConfirm,
  type ActionDef,
  type ColumnDef,
  type FilterDef,
  type FilterOption,
  type ResourceConfig,
  type ResourcePage,
  type ResourceQuery,
  type SortDirection,
} from '@/framework/types'
export {
  FILTER_PREFIX,
  PAGE_SIZE_OPTIONS,
  useResourceState,
  type ResourceState,
} from '@/framework/useResourceState'

/**
 * Define a resource screen.
 *
 * Identity at runtime, but it pins the generic so a column, filter or action
 * that does not match the row type is a compile error at the definition site
 * rather than a crash in a cell renderer.
 */
export function defineResource<TRow>(
  config: import('@/framework/types').ResourceConfig<TRow>,
): import('@/framework/types').ResourceConfig<TRow> {
  return config
}
