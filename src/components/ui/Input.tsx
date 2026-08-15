import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const CONTROL_BASE =
  'w-full rounded-md border bg-surface text-ink placeholder:text-ink-subtle ' +
  'transition-colors disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60'

function controlBorder(invalid: boolean): string {
  return invalid ? 'border-danger focus-visible:outline-danger' : 'border-border-strong'
}

export type InputProps = ComponentProps<'input'> & { invalid?: boolean }

export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlBorder(invalid), 'h-9 px-3 text-sm', className)}
      {...props}
    />
  )
}

export type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean }

export function Textarea({ invalid = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlBorder(invalid), 'min-h-20 px-3 py-2 text-sm', className)}
      {...props}
    />
  )
}

export type SelectProps = ComponentProps<'select'> & { invalid?: boolean }

export function Select({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, controlBorder(invalid), 'h-9 px-2.5 text-sm', className)}
      {...props}
    >
      {children}
    </select>
  )
}

export type CheckboxProps = ComponentProps<'input'>

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        'size-4 rounded border-border-strong text-accent accent-[var(--admin-accent)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
