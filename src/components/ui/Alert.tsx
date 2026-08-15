import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type AlertTone = 'info' | 'positive' | 'warning' | 'danger'

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'bg-info-soft text-info',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

const TONE_ICONS: Record<AlertTone, ComponentType<{ className?: string }>> = {
  info: Info,
  positive: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

export type AlertProps = {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const Icon = TONE_ICONS[tone]

  return (
    <div
      // Errors must reach a screen reader without stealing focus from the
      // field the user is still working in.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-md px-3 py-2.5 text-sm', TONE_CLASSES[tone], className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div> : null}
      </div>
    </div>
  )
}
