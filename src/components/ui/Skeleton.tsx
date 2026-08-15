import { cn } from '@/lib/cn'

export type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded bg-surface-sunken', className)}
    />
  )
}

export type SkeletonTableProps = {
  rows?: number
  columns?: number
}

/** Loading placeholder shaped like the table it replaces, to avoid layout shift. */
export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div role="status" aria-label="Cargando resultados" className="divide-y divide-border-base">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4 flex-1', columnIndex === 0 && 'max-w-[28%]')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
