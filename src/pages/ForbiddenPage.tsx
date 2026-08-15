import { Lock } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/app/session-context'
import { Button, Card, CardBody, EmptyState } from '@/components/ui'

export type ForbiddenPageProps = {
  /** Shown so a user can tell support exactly what they are missing. */
  permission?: string
}

/**
 * Shown when a route is reached without the permission it requires - by a
 * bookmark, a shared link, or a role that changed mid-session. The nav hides
 * such routes, but hiding is not enforcement.
 */
export function ForbiddenPage({ permission }: ForbiddenPageProps) {
  const { role } = useCurrentUser()

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Card>
        <CardBody>
          <EmptyState
            icon={<Lock aria-hidden="true" className="size-7" />}
            title="No tienes acceso a esta pantalla"
            description={`Tu rol actual es ${role.name}. Si necesitas acceso, solicítalo al administrador de la plataforma.`}
            action={
              <Link to="/">
                <Button variant="primary" size="sm">
                  Volver al inicio
                </Button>
              </Link>
            }
          />
          {permission ? (
            <p className="mt-2 text-center text-xs text-ink-subtle">
              Permiso requerido:{' '}
              <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-ink-muted">
                {permission}
              </code>
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
