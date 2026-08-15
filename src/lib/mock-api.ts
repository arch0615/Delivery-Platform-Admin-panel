import type { ResourcePage, ResourceQuery } from '@/framework/types'

/*
 * In-memory stand-in for a list endpoint.
 *
 * Deliberately does the filtering, sorting and slicing here rather than in the
 * component, so screens are written against server-side pagination from the
 * start. A screen that quietly sorts a full in-memory array works fine at 20
 * rows and falls over at 20,000 - and that only shows up in production.
 */

export type QueryableConfig<TRow> = {
  /** Fields concatenated for the free-text search box. */
  searchFields: (row: TRow) => string[]
  /** Comparable value per sortable column id. */
  sortValues: (row: TRow) => Record<string, string | number | boolean | null>
  /** Value each filter id matches against, as a string. */
  filterValues?: (row: TRow) => Record<string, string>
  /** Simulated round trip, so loading states are real during development. */
  latencyMs?: number
}

/**
 * Lowercase and strip diacritics for searching.
 *
 * Operators type "Bogota", "Merida", "Nunoa" - nobody reaches for accents
 * while a queue is backing up. A search that misses on them reads as missing
 * data, so both sides are folded before comparing.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-MX')
}

function compare(a: string | number | boolean | null, b: string | number | boolean | null): number {
  if (a === b) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? -1 : 1
  }

  // Locale-aware so accented Spanish sorts correctly: "Ñ" after "N", not last.
  return String(a).localeCompare(String(b), 'es-MX', { sensitivity: 'base', numeric: true })
}

export async function queryCollection<TRow>(
  source: readonly TRow[],
  query: ResourceQuery,
  config: QueryableConfig<TRow>,
): Promise<ResourcePage<TRow>> {
  const { latencyMs = 220 } = config

  if (latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, latencyMs))
  }

  let rows = [...source]

  const search = fold(query.search.trim())
  if (search !== '') {
    rows = rows.filter((row) =>
      config.searchFields(row).some((field) => fold(field).includes(search)),
    )
  }

  const filterValues = config.filterValues
  if (filterValues) {
    for (const [filterId, value] of Object.entries(query.filters)) {
      if (value === '') {
        continue
      }
      rows = rows.filter((row) => filterValues(row)[filterId] === value)
    }
  }

  if (query.sort) {
    const sortKey = query.sort
    const factor = query.direction === 'desc' ? -1 : 1

    rows.sort((a, b) => {
      const left = config.sortValues(a)[sortKey] ?? null
      const right = config.sortValues(b)[sortKey] ?? null
      return compare(left, right) * factor
    })
  }

  const total = rows.length
  const start = (query.page - 1) * query.pageSize

  return { rows: rows.slice(start, start + query.pageSize), total }
}
