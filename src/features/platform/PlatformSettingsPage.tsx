import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Flag, RotateCcw, Settings2 } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser } from '@/app/session-context'
import { PageHeader } from '@/components/shell/PageHeader'
import { Alert, Badge, Button, Card, CardBody, CardHeader, DateTime, Input } from '@/components/ui'
import { ConfirmDialog } from '@/framework'
import { recordAudit } from '@/lib/audit'
import { cn } from '@/lib/cn'
import {
  formatSettingValue,
  listFlags,
  listSettings,
  settingGroups,
  updateFlag,
  updateSetting,
  type FeatureFlag,
  type PlatformSetting,
} from '@/lib/platform-settings'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { useSession } from '@/app/session-context'

/*
 * A-015 Platform settings and feature flags.
 *
 * These are data rather than deployment config, which is what lets one
 * deployment serve every market (web architecture.txt P8) and lets release be
 * separated from launch.
 *
 * Flags are treated as the riskier of the two: flipping cash-on-delivery or
 * automatic dispatch changes how money and orders move, so each one confirms
 * and records a reason.
 */

const QUERY_KEY = 'platform-settings'

export function PlatformSettingsPage() {
  const { can } = useSession()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  const [pendingFlag, setPendingFlag] = useState<{ flag: FeatureFlag; enable: boolean } | null>(
    null,
  )

  const query = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => Promise.resolve({ settings: [...listSettings()], flags: [...listFlags()] }),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
  }

  if (!can('platform.view')) {
    return <ForbiddenPage permission="platform.view" />
  }

  const editable = can('platform.manage')
  const settings = query.data?.settings ?? []
  const flags = query.data?.flags ?? []

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <PageHeader
        title="Configuración de la plataforma"
        description="Parámetros operativos e interruptores de funcionalidad. Cada cambio queda en la bitácora."
      />

      {!editable ? (
        <Alert tone="info" className="mt-4">
          Tienes acceso de lectura. Se requiere el permiso <code>platform.manage</code> para
          modificar.
        </Alert>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Flag aria-hidden="true" className="size-3.5 text-ink-subtle" />
              Interruptores de funcionalidad
            </span>
          }
          description="Permiten separar el despliegue del lanzamiento. Apagar un interruptor pone su porcentaje en cero."
        />

        <ul className="divide-y divide-border-base">
          {flags.map((flag) => (
            <li key={flag.key} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {flag.label}
                    {flag.enabled ? (
                      <Badge tone="positive" dot>
                        {flag.rolloutPercent === 100 ? 'Activo' : `${flag.rolloutPercent}%`}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Apagado</Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{flag.description}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-subtle">{flag.key}</p>
                </div>

                {editable ? (
                  <Button
                    size="sm"
                    variant={flag.enabled ? 'secondary' : 'primary'}
                    onClick={() => {
                      setPendingFlag({ flag, enable: !flag.enabled })
                    }}
                  >
                    {flag.enabled ? 'Apagar' : 'Encender'}
                  </Button>
                ) : null}
              </div>

              {flag.enabled && editable ? (
                <RolloutControl
                  flag={flag}
                  onChange={(percent) => {
                    updateFlag(flag.key, { rolloutPercent: percent }, user.email)
                    recordAudit({
                      actorName: user.name,
                      actorEmail: user.email,
                      action: 'feature_flag.rollout',
                      entityType: 'feature_flag',
                      entityId: flag.key,
                      entityLabel: flag.label,
                      before: { rolloutPercent: flag.rolloutPercent },
                      after: { rolloutPercent: percent },
                    })
                    refresh()
                  }}
                />
              ) : null}

              <p className="mt-2 text-[11px] text-ink-subtle">
                Modificado <DateTime value={flag.updatedAt} display="date" /> por {flag.updatedBy}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {settingGroups().map((group) => (
        <Card key={group} className="mt-5">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Settings2 aria-hidden="true" className="size-3.5 text-ink-subtle" />
                {group}
              </span>
            }
          />
          <CardBody className="grid gap-4">
            {settings
              .filter((setting) => setting.group === group)
              .map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  editable={editable}
                  onSave={(value) => {
                    updateSetting(setting.key, value, user.email)
                    recordAudit({
                      actorName: user.name,
                      actorEmail: user.email,
                      action: 'settings.change',
                      entityType: 'platform_setting',
                      entityId: setting.key,
                      entityLabel: setting.label,
                      before: { value: setting.value },
                      after: { value },
                    })
                    refresh()
                  }}
                />
              ))}
          </CardBody>
        </Card>
      ))}

      {pendingFlag ? (
        <ConfirmDialog
          open
          title={pendingFlag.enable ? 'Encender interruptor' : 'Apagar interruptor'}
          tone={pendingFlag.enable ? 'default' : 'danger'}
          description={
            <>
              <strong className="text-ink">{pendingFlag.flag.label}</strong>{' '}
              {pendingFlag.enable
                ? 'quedará activo para el porcentaje que definas.'
                : 'dejará de aplicar de inmediato y su porcentaje volverá a cero.'}
            </>
          }
          consequence={pendingFlag.flag.description}
          confirmLabel={pendingFlag.enable ? 'Encender' : 'Apagar'}
          requireReason
          onConfirm={(reason) => {
            updateFlag(
              pendingFlag.flag.key,
              {
                enabled: pendingFlag.enable,
                ...(pendingFlag.enable ? { rolloutPercent: 100 } : {}),
              },
              user.email,
            )
            recordAudit({
              actorName: user.name,
              actorEmail: user.email,
              action: pendingFlag.enable ? 'feature_flag.enable' : 'feature_flag.disable',
              entityType: 'feature_flag',
              entityId: pendingFlag.flag.key,
              entityLabel: pendingFlag.flag.label,
              before: {
                enabled: pendingFlag.flag.enabled,
                rolloutPercent: pendingFlag.flag.rolloutPercent,
              },
              after: { enabled: pendingFlag.enable },
              reason,
            })
            setPendingFlag(null)
            refresh()
          }}
          onCancel={() => {
            setPendingFlag(null)
          }}
        />
      ) : null}
    </div>
  )
}

function RolloutControl({
  flag,
  onChange,
}: {
  flag: FeatureFlag
  onChange: (percent: number) => void
}) {
  const steps = [10, 25, 50, 100]

  return (
    <div className="mt-2.5 flex items-center gap-2">
      <span className="text-xs text-ink-muted">Alcance</span>
      {steps.map((step) => (
        <button
          key={step}
          type="button"
          onClick={() => {
            onChange(step)
          }}
          aria-pressed={flag.rolloutPercent === step}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            flag.rolloutPercent === step
              ? 'bg-accent text-accent-ink'
              : 'bg-surface-sunken text-ink-muted hover:text-ink',
          )}
        >
          {step}%
        </button>
      ))}
    </div>
  )
}

function SettingRow({
  setting,
  editable,
  onSave,
}: {
  setting: PlatformSetting
  editable: boolean
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState(setting.value)
  const dirty = draft !== setting.value

  return (
    <div className="grid gap-1.5 border-b border-border-base pb-4 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{setting.label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{setting.description}</p>
          <p className="mt-1 font-mono text-[11px] text-ink-subtle">{setting.key}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {setting.type === 'money_minor' ? (
            <span className="text-xs text-ink-subtle">centavos</span>
          ) : null}

          <Input
            type={setting.type === 'text' ? 'text' : 'number'}
            value={draft}
            disabled={!editable}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            aria-label={setting.label}
            className="w-28 text-right"
          />

          {dirty ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onSave(draft)
                }}
                leadingIcon={<Check aria-hidden="true" className="size-3.5" />}
              >
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Descartar cambio"
                onClick={() => {
                  setDraft(setting.value)
                }}
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
              </Button>
            </>
          ) : (
            <span className="w-28 text-right text-xs text-ink-muted">
              {formatSettingValue(setting)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
