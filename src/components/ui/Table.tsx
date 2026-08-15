import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

/*
 * Dense table primitives. The admin panel is table-heavy - these set the
 * shared rhythm so every list screen reads the same.
 *
 * Wide tables scroll inside their own container; the page body must never
 * scroll horizontally.
 */

export function TableWrapper({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)} {...props}>
      {children}
    </div>
  )
}

export function Table({ className, children, ...props }: ComponentProps<'table'>) {
  return (
    <table className={cn('w-full border-collapse text-left text-sm', className)} {...props}>
      {children}
    </table>
  )
}

export function THead({ className, children, ...props }: ComponentProps<'thead'>) {
  return (
    <thead className={cn('border-b border-border-base bg-surface-muted', className)} {...props}>
      {children}
    </thead>
  )
}

export function TBody({ className, children, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody className={cn('divide-y divide-border-base', className)} {...props}>
      {children}
    </tbody>
  )
}

export type TRProps = ComponentProps<'tr'> & {
  /** Adds hover affordance for rows that open a detail view. */
  interactive?: boolean
}

export function TR({ interactive = false, className, children, ...props }: TRProps) {
  return (
    <tr
      className={cn(interactive && 'cursor-pointer hover:bg-surface-muted', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

export type THProps = ComponentProps<'th'> & { numeric?: boolean }

export function TH({ numeric = false, className, children, ...props }: THProps) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-muted uppercase whitespace-nowrap',
        numeric && 'text-right',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export type TDProps = ComponentProps<'td'> & { numeric?: boolean }

export function TD({ numeric = false, className, children, ...props }: TDProps) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 align-middle text-ink',
        // Numbers right-align with tabular figures so columns line up.
        numeric && 'tabular text-right',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}
