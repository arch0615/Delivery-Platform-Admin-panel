import type { ColumnDef } from '@/framework/types'

/*
 * CSV export.
 *
 * Excel is the destination in practice, which drives two decisions: a UTF-8
 * BOM so accented Spanish renders, and CRLF line endings.
 */

/**
 * Escape a value for CSV.
 *
 * A leading =, +, - or @ makes Excel treat the cell as a formula, so those are
 * prefixed with an apostrophe. Without it, exported data becomes an injection
 * vector the moment someone opens the file.
 */
export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value)
  const neutralized = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text

  return /[",\n\r]/.test(neutralized) ? `"${neutralized.replace(/"/g, '""')}"` : neutralized
}

export function buildCsv<TRow>(rows: TRow[], columns: ColumnDef<TRow>[]): string {
  const exportable = columns.filter((column) => column.exportValue !== undefined)

  const header = exportable.map((column) => escapeCsvValue(column.header)).join(',')

  const body = rows.map((row) =>
    exportable.map((column) => escapeCsvValue(column.exportValue?.(row) ?? '')).join(','),
  )

  return [header, ...body].join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM first: without it Excel reads UTF-8 as Latin-1 and mangles accents.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export function timestampedFilename(key: string, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '')
  return `${key}_${stamp}.csv`
}
