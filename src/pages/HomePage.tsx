import { Link } from 'react-router'

import { NAV_GROUPS } from '@/app/nav'
import { useCurrentUser } from '@/app/session-context'
import { PageHeader } from '@/components/shell/PageHeader'
import { Badge, Card, CardBody, CardHeader } from '@/components/ui'

/*
 * Interim home screen.
 *
 * Replaced by the reports overview dashboard (A-086) in Sprint 9. Until then
 * it reports build progress and what the current role can reach, which is the
 * useful thing to see on opening the panel.
 */

type Step = {
  index: number
  label: string
  status: 'done' | 'next' | 'pending'
}

const STEPS: Step[] = [
  { index: 1, label: 'Andamiaje del proyecto y herramientas', status: 'done' },
  { index: 2, label: 'Capa de tema y componentes base (A-006)', status: 'done' },
  { index: 3, label: 'Shell de la aplicación y navegación (A-003)', status: 'done' },
  { index: 4, label: 'Inicio de sesión y 2FA (A-001, A-002)', status: 'next' },
  { index: 5, label: 'Framework de recursos (A-005)', status: 'pending' },
  { index: 6, label: 'Mercados, zonas y taxonomía (A-011 … A-018)', status: 'pending' },
]

const STATUS_LABEL: Record<Step['status'], string> = {
  done: 'Listo',
  next: 'Siguiente',
  pending: 'Pendiente',
}

const STATUS_TONE = {
  done: 'positive',
  next: 'accent',
  pending: 'neutral',
} as const

export function HomePage() {
  const { user, role, market, can } = useCurrentUser()

  const totalItems = NAV_GROUPS.reduce((count, group) => count + group.items.length, 0)
  const visibleItems = NAV_GROUPS.reduce(
    (count, group) => count + group.items.filter((item) => can(item.permission)).length,
    0,
  )
  const hiddenGroups = NAV_GROUPS.filter(
    (group) => !group.items.some((item) => can(item.permission)),
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <PageHeader
        title={`Hola, ${user.name.split(' ')[0] ?? user.name}`}
        description={`${role.name} · ${market.name} · ${market.timezone}`}
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Avance de construcción" description="Panel administrativo (APP-C)" />
          <CardBody>
            <ol className="grid gap-2.5">
              {STEPS.map((step) => (
                <li key={step.index} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 font-mono text-xs text-ink-subtle">
                    {String(step.index).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-ink">{step.label}</span>
                  <Badge tone={STATUS_TONE[step.status]} dot={step.status !== 'pending'}>
                    {STATUS_LABEL[step.status]}
                  </Badge>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alcance de tu rol"
            description="La navegación oculta lo que tu rol no puede abrir."
          />
          <CardBody>
            <p className="text-sm text-ink">
              Ves <span className="font-semibold">{visibleItems}</span> de {totalItems} pantallas.
            </p>

            {hiddenGroups.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs text-ink-muted">Secciones ocultas para {role.name}:</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {hiddenGroups.map((group) => (
                    <Badge key={group.id} tone="neutral">
                      {group.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                Este rol tiene acceso a todas las secciones.
              </p>
            )}

            <p className="mt-4 text-xs text-ink-subtle">
              Cierra sesión y entra con otra cuenta para comprobarlo. Ocultar un botón es
              experiencia de usuario, no seguridad: el servidor vuelve a validar cada petición.
            </p>
          </CardBody>
        </Card>
      </div>

      <p className="mt-5 text-center text-xs text-ink-subtle">
        55 pantallas · 9 sprints · 18 semanas ·{' '}
        <Link to="/ui" className="text-accent hover:underline">
          sistema de diseño
        </Link>
      </p>
    </div>
  )
}
