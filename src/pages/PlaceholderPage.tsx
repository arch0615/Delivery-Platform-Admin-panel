import { Construction } from 'lucide-react'
import { useLocation } from 'react-router'

import { findNavGroup, findNavItem } from '@/app/nav'
import { PageHeader } from '@/components/shell/PageHeader'
import { Badge, Card, CardBody, EmptyState } from '@/components/ui'

/**
 * Stand-in for a screen that is routed and permission-gated but not yet built.
 *
 * It reports the screen's ID and scheduled sprint from the navigation model,
 * so clicking through the shell shows exactly what is real and what is not.
 * Each is replaced by its real page as the sprint that owns it lands.
 */
export function PlaceholderPage() {
  const { pathname } = useLocation()

  const item = findNavItem(pathname)
  const group = findNavGroup(pathname)

  if (!item) {
    return null
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <PageHeader
        title={item.label}
        description={group ? `${group.label} · ${item.path}` : item.path}
        actions={
          <>
            <Badge tone="neutral">{item.id}</Badge>
            <Badge tone="accent">Sprint {item.sprint}</Badge>
          </>
        }
      />

      <Card className="mt-5">
        <CardBody>
          <EmptyState
            icon={<Construction aria-hidden="true" className="size-7" />}
            title="Pantalla pendiente de construcción"
            description={`${item.id} está programada para el sprint ${item.sprint}. La ruta y los permisos ya funcionan; falta el contenido.`}
          />
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-xs text-ink-subtle">
        Permiso requerido:{' '}
        <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-ink-muted">
          {item.permission}
        </code>
      </p>
    </div>
  )
}
