import { cn } from '@/lib/cn'

export type CodeInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  length?: number
  autoFocus?: boolean
}

/**
 * Single input rather than one box per digit.
 *
 * Split boxes look neater but fight paste, password managers, and iOS SMS
 * autofill. `autocomplete="one-time-code"` only works reliably on one field.
 */
export function CodeInput({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
  length = 6,
  autoFocus = false,
}: CodeInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      maxLength={length}
      value={value}
      onChange={(event) => {
        onChange(event.target.value.replace(/\D/g, '').slice(0, length))
      }}
      placeholder={'0'.repeat(length)}
      className={cn(
        'w-full rounded-md border bg-surface px-3 py-2.5 text-center font-mono text-2xl',
        'tracking-[0.4em] text-ink placeholder:text-ink-subtle',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
        invalid ? 'border-danger' : 'border-border-strong',
      )}
    />
  )
}
