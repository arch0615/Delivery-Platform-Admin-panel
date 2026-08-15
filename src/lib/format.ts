/*
 * FORMATTERS
 *
 * Every money value in this application passes through formatMoney(). Amounts
 * are integer MINOR UNITS plus an ISO-4217 currency code, per rule R2 of the
 * database schema - never a float, never a pre-formatted string from the API.
 *
 * Rates are integer BASIS POINTS (rule R3): 2250 bps = 22.5%.
 *
 * Timestamps are UTC ISO strings; the market's IANA timezone decides how they
 * render (rule R4). A date shown without its market timezone is a support bug
 * waiting to happen.
 */

export const DEFAULT_LOCALE = 'es-MX'
export const DEFAULT_TIME_ZONE = 'America/Mexico_City'

/**
 * Currencies whose minor unit is not 1/100. Extend as markets are added.
 * (JPY and KRW have no minor unit; CLP and ISK are also zero-decimal.)
 */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'ISK', 'VND'])

function minorUnitExponent(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2
}

/**
 * Format an integer minor-unit amount as currency.
 *
 * @param amountMinor centavos for MXN, cents for USD, whole units for JPY
 * @example formatMoney(123456, 'MXN') -> "$1,234.56"
 *
 * Amounts are assumed to sit inside Number.MAX_SAFE_INTEGER, which holds for
 * any realistic order, settlement, or payout on this platform.
 */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const exponent = minorUnitExponent(currency)
  const amount = amountMinor / 10 ** exponent

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amount)
}

/**
 * Money without the currency symbol - for table columns that carry the
 * currency in the header rather than on every row.
 */
export function formatMoneyPlain(
  amountMinor: number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const exponent = minorUnitExponent(currency)

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amountMinor / 10 ** exponent)
}

/** 2250 -> "22.5%" */
export function formatBps(bps: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(bps / 10_000)
}

/** Apply a basis-point rate to a minor-unit amount, rounding half away from zero. */
export function applyBps(amountMinor: number, bps: number): number {
  const raw = (amountMinor * bps) / 10_000
  return raw < 0 ? -Math.round(-raw) : Math.round(raw)
}

export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value)
}

/** "14 ago 2026" */
export function formatDate(
  value: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(toDate(value))
}

/** "14 ago 2026, 21:30" */
export function formatDateTime(
  value: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(toDate(value))
}

/** "21:30" - for dense operational tables where the date is implied. */
export function formatTime(
  value: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(toDate(value))
}

/**
 * "hace 5 min" - order age in the live operations console.
 * Uses Intl.RelativeTimeFormat so it localizes with the market.
 */
export function formatRelativeTime(
  value: string | Date,
  now: Date = new Date(),
  locale: string = DEFAULT_LOCALE,
): string {
  const deltaSeconds = Math.round((toDate(value).getTime() - now.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const thresholds: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ]

  let magnitude = deltaSeconds
  for (const [unit, step] of thresholds) {
    if (Math.abs(magnitude) < step) {
      return formatter.format(magnitude, unit)
    }
    magnitude = Math.trunc(magnitude / step)
  }

  return formatter.format(magnitude, 'year')
}

/** Elapsed time as "12m" / "1h 04m" - order age badges. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds))
  const hours = Math.trunc(total / 3600)
  const minutes = Math.trunc((total % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}
