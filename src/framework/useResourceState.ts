import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { FilterDef, ResourceQuery, SortDirection } from '@/framework/types'

/*
 * URL-DRIVEN LIST STATE
 *
 * Filters, sort and pagination live in the query string, never in component
 * state. An operator has to be able to paste "orders older than 40 minutes in
 * Guadalajara" into a chat and have a colleague see the same rows, and the
 * back button has to work. Both fall out of keeping this in the URL.
 *
 * Parameter names are short because operators see them:
 *   page  size  sort  dir  q  f.<filterId>
 */

export const FILTER_PREFIX = 'f.'

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25

export type ResourceState = {
  query: ResourceQuery
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  toggleSort: (columnId: string) => void
  setSearch: (value: string) => void
  setFilter: (filterId: string, value: string) => void
  clearFilters: () => void
  /** True when anything narrows the list - drives the "no matches" copy. */
  isFiltered: boolean
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export type UseResourceStateOptions = {
  filters?: FilterDef[]
  defaultSort?: { id: string; direction: SortDirection }
  defaultPageSize?: number
}

export function useResourceState({
  filters = [],
  defaultSort,
  defaultPageSize = DEFAULT_PAGE_SIZE,
}: UseResourceStateOptions): ResourceState {
  const [searchParams, setSearchParams] = useSearchParams()

  const query = useMemo<ResourceQuery>(() => {
    const activeFilters: Record<string, string> = {}
    for (const filter of filters) {
      activeFilters[filter.id] = searchParams.get(`${FILTER_PREFIX}${filter.id}`) ?? ''
    }

    const direction = searchParams.get('dir')

    return {
      page: parsePositiveInt(searchParams.get('page'), 1),
      pageSize: parsePositiveInt(searchParams.get('size'), defaultPageSize),
      sort: searchParams.get('sort') ?? defaultSort?.id ?? null,
      direction:
        direction === 'asc' || direction === 'desc' ? direction : (defaultSort?.direction ?? 'asc'),
      search: searchParams.get('q') ?? '',
      filters: activeFilters,
    }
  }, [searchParams, filters, defaultSort, defaultPageSize])

  /**
   * Any change other than paging resets to page 1. Staying on page 7 while
   * filtering down to three results shows an empty table and reads as a bug.
   */
  const update = useCallback(
    (mutate: (params: URLSearchParams) => void, options: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams)
      mutate(next)

      if (options.resetPage !== false) {
        next.delete('page')
      }

      // Drop empty values so the URL stays readable and shareable.
      for (const [key, value] of Array.from(next.entries())) {
        if (value === '') {
          next.delete(key)
        }
      }

      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setPage = useCallback(
    (page: number) => {
      update(
        (params) => {
          if (page <= 1) {
            params.delete('page')
          } else {
            params.set('page', String(page))
          }
        },
        { resetPage: false },
      )
    },
    [update],
  )

  const setPageSize = useCallback(
    (pageSize: number) => {
      update((params) => {
        if (pageSize === defaultPageSize) {
          params.delete('size')
        } else {
          params.set('size', String(pageSize))
        }
      })
    },
    [update, defaultPageSize],
  )

  /** asc -> desc -> back to the default sort. */
  const toggleSort = useCallback(
    (columnId: string) => {
      update((params) => {
        const currentSort = params.get('sort') ?? defaultSort?.id ?? null
        const currentDirection = params.get('dir') ?? defaultSort?.direction ?? 'asc'

        if (currentSort !== columnId) {
          params.set('sort', columnId)
          params.set('dir', 'asc')
          return
        }

        if (currentDirection === 'asc') {
          params.set('sort', columnId)
          params.set('dir', 'desc')
          return
        }

        params.delete('sort')
        params.delete('dir')
      })
    },
    [update, defaultSort],
  )

  const setSearch = useCallback(
    (value: string) => {
      update((params) => {
        params.set('q', value.trim())
      })
    },
    [update],
  )

  const setFilter = useCallback(
    (filterId: string, value: string) => {
      update((params) => {
        params.set(`${FILTER_PREFIX}${filterId}`, value)
      })
    },
    [update],
  )

  const clearFilters = useCallback(() => {
    update((params) => {
      params.delete('q')
      for (const key of Array.from(params.keys())) {
        if (key.startsWith(FILTER_PREFIX)) {
          params.delete(key)
        }
      }
    })
  }, [update])

  const isFiltered =
    query.search !== '' || Object.values(query.filters).some((value) => value !== '')

  return {
    query,
    setPage,
    setPageSize,
    toggleSort,
    setSearch,
    setFilter,
    clearFilters,
    isFiltered,
  }
}
