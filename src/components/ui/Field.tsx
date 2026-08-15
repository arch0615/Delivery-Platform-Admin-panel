import { useId, type ReactElement, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type FieldProps = {
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  /** Receives the generated id so the label and error stay wired to the control. */
  children: (props: { id: string; describedBy: string | undefined }) => ReactElement
}

/**
 * Label + control + hint/error, with the accessibility wiring done once so no
 * form screen has to remember it.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({ id, describedBy })}

      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export type FormRowProps = {
  children: ReactNode
  className?: string
}

export function FormRow({ children, className }: FormRowProps) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
}
