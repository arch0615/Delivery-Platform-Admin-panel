import { cn } from '@/lib/cn'
import { formatBps, formatMoney, formatMoneyPlain } from '@/lib/format'

export type MoneyProps = {
  /** Integer minor units - centavos for MXN. Never a float. */
  amountMinor: number
  currency: string
  locale?: string
  /** Hide the currency symbol when the column header already carries it. */
  plain?: boolean
  /** Render negatives in the danger tone - refunds, adjustments, withholdings. */
  signed?: boolean
  className?: string
}

/**
 * The only sanctioned way to display money in this application.
 *
 * Rendering `amount / 100` inline anywhere else is a bug: it loses the
 * currency, skips locale rules, and breaks column alignment.
 */
export function Money({
  amountMinor,
  currency,
  locale,
  plain = false,
  signed = false,
  className,
}: MoneyProps) {
  const formatted = plain
    ? formatMoneyPlain(amountMinor, currency, locale)
    : formatMoney(amountMinor, currency, locale)

  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        signed && amountMinor < 0 && 'text-danger',
        signed && amountMinor > 0 && 'text-positive',
        className,
      )}
    >
      {formatted}
    </span>
  )
}

export type RateProps = {
  /** Basis points: 2250 renders as 22.5%. */
  bps: number
  locale?: string
  className?: string
}

export function Rate({ bps, locale, className }: RateProps) {
  return (
    <span className={cn('tabular whitespace-nowrap', className)}>{formatBps(bps, locale)}</span>
  )
}
