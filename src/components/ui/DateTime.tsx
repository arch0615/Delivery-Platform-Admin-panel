import { cn } from '@/lib/cn'
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTime,
} from '@/lib/format'

export type DateTimeDisplay = 'datetime' | 'date' | 'time' | 'relative'

export type DateTimeProps = {
  /** UTC ISO string from the API. */
  value: string | Date
  /** IANA zone of the market this record belongs to. */
  timeZone?: string
  locale?: string
  display?: DateTimeDisplay
  className?: string
}

/**
 * Timestamp rendered in the market's timezone, not the browser's.
 *
 * An operator in Mexico City looking at a Guadalajara order must see the
 * Guadalajara time, otherwise every SLA and sale-window question gets the
 * wrong answer. The machine-readable UTC value stays in the dateTime
 * attribute, and the full timestamp is available on hover.
 */
export function DateTime({
  value,
  timeZone = DEFAULT_TIME_ZONE,
  locale,
  display = 'datetime',
  className,
}: DateTimeProps) {
  const iso = value instanceof Date ? value.toISOString() : value

  const text =
    display === 'date'
      ? formatDate(value, timeZone, locale)
      : display === 'time'
        ? formatTime(value, timeZone, locale)
        : display === 'relative'
          ? formatRelativeTime(value, undefined, locale)
          : formatDateTime(value, timeZone, locale)

  return (
    <time
      dateTime={iso}
      title={`${formatDateTime(value, timeZone, locale)} (${timeZone})`}
      className={cn('tabular whitespace-nowrap', className)}
    >
      {text}
    </time>
  )
}
