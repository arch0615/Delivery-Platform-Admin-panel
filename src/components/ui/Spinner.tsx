import { cn } from '@/lib/cn'

export type SpinnerProps = {
  className?: string
  label?: string
}

export function Spinner({ className, label = 'Cargando' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}
