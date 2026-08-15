import { describe, expect, it } from 'vitest'

import { buildCsv, escapeCsvValue, timestampedFilename } from '@/framework/exportCsv'
import type { ColumnDef } from '@/framework/types'

type Row = { name: string; total: number; note: string }

const COLUMNS: ColumnDef<Row>[] = [
  { id: 'name', header: 'Nombre', cell: (row) => row.name, exportValue: (row) => row.name },
  { id: 'total', header: 'Total', cell: (row) => row.total, exportValue: (row) => row.total },
  // No exportValue: a rendered badge must not be stringified blindly.
  { id: 'status', header: 'Estado', cell: () => 'badge' },
  { id: 'note', header: 'Nota', cell: (row) => row.note, exportValue: (row) => row.note },
]

describe('escapeCsvValue', () => {
  it('passes plain values through', () => {
    expect(escapeCsvValue('Guadalajara')).toBe('Guadalajara')
    expect(escapeCsvValue(1234)).toBe('1234')
  })

  it('returns an empty string for null and undefined', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })

  it('quotes values containing a comma, quote or newline', () => {
    expect(escapeCsvValue('Ciudad, México')).toBe('"Ciudad, México"')
    expect(escapeCsvValue('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(escapeCsvValue('linea1\nlinea2')).toBe('"linea1\nlinea2"')
  })

  it('neutralizes values Excel would treat as a formula', () => {
    // CSV injection: without the leading apostrophe these execute on open.
    expect(escapeCsvValue('=1+1')).toBe("'=1+1")
    expect(escapeCsvValue('+SUM(A1)')).toBe("'+SUM(A1)")
    expect(escapeCsvValue('-2+3')).toBe("'-2+3")
    expect(escapeCsvValue('@import')).toBe("'@import")
  })

  it('quotes a neutralized value that also contains a comma', () => {
    expect(escapeCsvValue('=CMD("a,b")')).toBe('"\'=CMD(""a,b"")"')
  })
})

describe('buildCsv', () => {
  const rows: Row[] = [
    { name: 'Ciudad de México', total: 1200, note: 'ok' },
    { name: 'Bogotá, Colombia', total: 340, note: '=2+2' },
  ]

  it('includes only columns that declare an export value', () => {
    const csv = buildCsv(rows, COLUMNS)
    const [header] = csv.split('\r\n')

    expect(header).toBe('Nombre,Total,Nota')
    expect(header).not.toContain('Estado')
  })

  it('emits one CRLF-separated line per row', () => {
    const lines = buildCsv(rows, COLUMNS).split('\r\n')

    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('Ciudad de México,1200,ok')
    expect(lines[2]).toBe('"Bogotá, Colombia",340,\'=2+2')
  })

  it('produces a header-only file for an empty result set', () => {
    expect(buildCsv([], COLUMNS)).toBe('Nombre,Total,Nota')
  })
})

describe('timestampedFilename', () => {
  it('names the file after the resource and the moment', () => {
    const name = timestampedFilename('markets', new Date('2026-08-15T09:30:00Z'))
    expect(name).toBe('markets_2026-08-15_0930.csv')
  })
})
