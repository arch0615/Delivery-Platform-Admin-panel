import { describe, expect, it } from 'vitest'

import type { ResourceQuery } from '@/framework/types'
import { queryCollection } from '@/lib/mock-api'

type Row = { id: string; name: string; country: string; live: boolean; rank: number }

const ROWS: Row[] = [
  { id: '1', name: 'Ciudad de México', country: 'MX', live: true, rank: 3 },
  { id: '2', name: 'Guadalajara', country: 'MX', live: true, rank: 1 },
  { id: '3', name: 'Ñuñoa', country: 'CL', live: false, rank: 2 },
  { id: '4', name: 'Bogotá', country: 'CO', live: false, rank: 10 },
  { id: '5', name: 'Medellín', country: 'CO', live: false, rank: 25 },
]

const CONFIG = {
  searchFields: (row: Row) => [row.name, row.country],
  sortValues: (row: Row) => ({ name: row.name, rank: row.rank, live: row.live }),
  filterValues: (row: Row) => ({ country: row.country, live: String(row.live) }),
  latencyMs: 0,
}

function query(overrides: Partial<ResourceQuery> = {}): ResourceQuery {
  return {
    page: 1,
    pageSize: 25,
    sort: null,
    direction: 'asc',
    search: '',
    filters: {},
    ...overrides,
  }
}

describe('queryCollection', () => {
  it('returns everything with an empty query', async () => {
    const page = await queryCollection(ROWS, query(), CONFIG)
    expect(page.total).toBe(5)
    expect(page.rows).toHaveLength(5)
  })

  it('searches case-insensitively across the declared fields', async () => {
    const page = await queryCollection(ROWS, query({ search: 'GUADA' }), CONFIG)
    expect(page.rows.map((row) => row.id)).toEqual(['2'])
  })

  it('matches accented text the user typed without accents', async () => {
    // "Bogota" should find "Bogotá" - operators do not type accents in a
    // hurry, and a search that fails on them reads as missing data.
    const page = await queryCollection(ROWS, query({ search: 'Bogota' }), CONFIG)
    expect(page.rows.map((row) => row.id)).toEqual(['4'])
  })

  it('applies filters', async () => {
    const page = await queryCollection(ROWS, query({ filters: { country: 'CO' } }), CONFIG)
    expect(page.total).toBe(2)
  })

  it('ignores a filter set to the empty string', async () => {
    const page = await queryCollection(ROWS, query({ filters: { country: '' } }), CONFIG)
    expect(page.total).toBe(5)
  })

  it('combines search and filters', async () => {
    const page = await queryCollection(
      ROWS,
      query({ search: 'a', filters: { live: 'true' } }),
      CONFIG,
    )
    expect(page.rows.every((row) => row.live)).toBe(true)
  })

  it('sorts ascending and descending', async () => {
    const asc = await queryCollection(ROWS, query({ sort: 'rank' }), CONFIG)
    expect(asc.rows.map((row) => row.rank)).toEqual([1, 2, 3, 10, 25])

    const desc = await queryCollection(ROWS, query({ sort: 'rank', direction: 'desc' }), CONFIG)
    expect(desc.rows.map((row) => row.rank)).toEqual([25, 10, 3, 2, 1])
  })

  it('sorts text with Spanish collation', async () => {
    // Ñ sorts after N, not at the end of the alphabet as raw code points give.
    const page = await queryCollection(ROWS, query({ sort: 'name' }), CONFIG)
    expect(page.rows.map((row) => row.name)).toEqual([
      'Bogotá',
      'Ciudad de México',
      'Guadalajara',
      'Medellín',
      'Ñuñoa',
    ])
  })

  it('paginates, reporting the full total rather than the page length', async () => {
    const page = await queryCollection(ROWS, query({ sort: 'rank', pageSize: 2, page: 2 }), CONFIG)

    expect(page.rows.map((row) => row.rank)).toEqual([3, 10])
    expect(page.total).toBe(5)
  })

  it('returns an empty page past the end without failing', async () => {
    const page = await queryCollection(ROWS, query({ pageSize: 2, page: 99 }), CONFIG)
    expect(page.rows).toEqual([])
    expect(page.total).toBe(5)
  })

  it('does not mutate the source collection', async () => {
    const order = ROWS.map((row) => row.id)
    await queryCollection(ROWS, query({ sort: 'rank', direction: 'desc' }), CONFIG)
    expect(ROWS.map((row) => row.id)).toEqual(order)
  })
})
