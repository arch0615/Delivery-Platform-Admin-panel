import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, ShieldCheck, ShieldOff, UserMinus, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { useCurrentUser } from '@/app/session-context'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DateTime,
  Drawer,
  Field,
  Input,
  Select,
} from '@/components/ui'
import { ResourceListPage, defineResource } from '@/framework'
import {
  createAdminUserId,
  listAdminUsers,
  resetAdminUserTotp,
  setAdminUserActive,
  upsertAdminUser,
  type AdminUserRecord,
} from '@/lib/admin-users'
import { recordAudit } from '@/lib/audit'
import { listMarkets } from '@/lib/markets'
import { queryCollection } from '@/lib/mock-api'
import { listRoles } from '@/lib/roles'

/*
 * A-014 Admin users.
 *
 * An admin account can refund orders and change who has access, so every
 * mutation here writes to the audit log and the destructive ones demand a
 * reason.
 */

const RESOURCE_KEY = 'admin-users'

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { user: actor } = useCurrentUser()
  const [editing, setEditing] = useState<AdminUserRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [RESOURCE_KEY] })
  }

  const config = useMemo(
    () =>
      defineResource<AdminUserRecord>({
        key: RESOURCE_KEY,
        title: 'Usuarios administrativos',
        description:
          'Quién puede entrar al panel, con qué rol y en qué mercados. Cada cambio queda en la bitácora.',
        permission: 'users.manage',
        getRowId: (row) => row.id,
        searchPlaceholder: 'Buscar por nombre o correo…',
        defaultSort: { id: 'name', direction: 'asc' },

        columns: [
          {
            id: 'name',
            header: 'Usuario',
            sortable: true,
            cell: (row) => (
              <span className="min-w-0">
                <span className="block font-medium">{row.name}</span>
                <span className="block text-xs text-ink-muted">{row.email}</span>
              </span>
            ),
            exportValue: (row) => `${row.name} <${row.email}>`,
          },
          {
            id: 'role',
            header: 'Rol',
            sortable: true,
            cell: (row) => {
              const role = listRoles().find((entry) => entry.code === row.roleCode)
              return role ? (
                <Badge tone="neutral">{role.name}</Badge>
              ) : (
                // A deleted role denies everything, so say so rather than
                // showing a blank cell.
                <Badge tone="danger">Rol eliminado</Badge>
              )
            },
            exportValue: (row) => row.roleCode,
          },
          {
            id: 'marketScope',
            header: 'Mercados',
            cell: (row) =>
              row.marketScope.length === 0 ? (
                <span className="text-xs text-ink-muted">Todos</span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {row.marketScope.map((marketId) => (
                    <Badge key={marketId} tone="neutral">
                      {listMarkets().find((market) => market.id === marketId)?.code ?? marketId}
                    </Badge>
                  ))}
                </span>
              ),
            exportValue: (row) =>
              row.marketScope.length === 0 ? 'todos' : row.marketScope.join(' '),
          },
          {
            id: 'totpEnabled',
            header: '2FA',
            sortable: true,
            cell: (row) =>
              row.totpEnabled ? (
                <Badge tone="positive" dot>
                  Activa
                </Badge>
              ) : (
                <Badge tone="warning">Sin configurar</Badge>
              ),
            exportValue: (row) => (row.totpEnabled ? 'activa' : 'pendiente'),
          },
          {
            id: 'lastLoginAt',
            header: 'Último acceso',
            sortable: true,
            cell: (row) =>
              row.lastLoginAt ? (
                <DateTime value={row.lastLoginAt} />
              ) : (
                <span className="text-xs text-ink-subtle">Nunca</span>
              ),
            exportValue: (row) => row.lastLoginAt ?? '',
          },
          {
            id: 'isActive',
            header: 'Estado',
            sortable: true,
            cell: (row) =>
              row.isActive ? (
                <Badge tone="positive" dot>
                  Activo
                </Badge>
              ) : (
                <Badge tone="neutral">Desactivado</Badge>
              ),
            exportValue: (row) => (row.isActive ? 'activo' : 'desactivado'),
          },
        ],

        filters: [
          {
            id: 'roleCode',
            type: 'select',
            label: 'Rol',
            allLabel: 'Todos los roles',
            options: listRoles().map((role) => ({ value: role.code, label: role.name })),
          },
          {
            id: 'isActive',
            type: 'boolean',
            label: 'Estado',
            trueLabel: 'Activos',
            falseLabel: 'Desactivados',
          },
        ],

        fetch: (query) =>
          queryCollection(listAdminUsers(), query, {
            searchFields: (row) => [row.name, row.email],
            sortValues: (row) => ({
              name: row.name,
              role: row.roleCode,
              totpEnabled: row.totpEnabled,
              lastLoginAt: row.lastLoginAt,
              isActive: row.isActive,
            }),
            filterValues: (row) => ({
              roleCode: row.roleCode,
              isActive: String(row.isActive),
            }),
          }),

        toolbar: (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null)
              setDrawerOpen(true)
            }}
            leadingIcon={<Plus aria-hidden="true" className="size-3.5" />}
          >
            Invitar usuario
          </Button>
        ),

        rowActions: [
          {
            id: 'edit',
            label: 'Editar',
            icon: <Pencil aria-hidden="true" className="size-3.5" />,
            permission: 'users.manage',
            run: (row) => {
              setEditing(row)
              setDrawerOpen(true)
            },
          },
          {
            id: 'reset-2fa',
            label: 'Restablecer 2FA',
            icon: <KeyRound aria-hidden="true" className="size-3.5" />,
            permission: 'users.manage',
            hidden: (row) => !row.totpEnabled,
            confirm: {
              title: 'Restablecer verificación en dos pasos',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> deberá configurar un nuevo
                  autenticador en su próximo inicio de sesión.
                </>
              ),
              consequence: () =>
                'Confirma la identidad de la persona por un canal distinto antes de hacerlo: es la vía habitual para tomar una cuenta ajena.',
              confirmLabel: 'Restablecer 2FA',
              requireReason: true,
            },
            run: (row, { reason }) => {
              resetAdminUserTotp(row.id)
              recordAudit({
                actorName: actor.name,
                actorEmail: actor.email,
                action: 'admin_user.reset_2fa',
                entityType: 'admin_user',
                entityId: row.id,
                entityLabel: row.email,
                before: { totpEnabled: true },
                after: { totpEnabled: false },
                reason,
              })
            },
          },
          {
            id: 'activate',
            label: 'Reactivar acceso',
            icon: <UserPlus aria-hidden="true" className="size-3.5" />,
            permission: 'users.manage',
            hidden: (row) => row.isActive,
            confirm: {
              title: 'Reactivar acceso',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> podrá entrar de nuevo al panel.
                </>
              ),
              confirmLabel: 'Reactivar',
              requireReason: true,
            },
            run: (row, { reason }) => {
              setAdminUserActive(row.id, true)
              recordAudit({
                actorName: actor.name,
                actorEmail: actor.email,
                action: 'admin_user.activate',
                entityType: 'admin_user',
                entityId: row.id,
                entityLabel: row.email,
                before: { isActive: false },
                after: { isActive: true },
                reason,
              })
            },
          },
          {
            id: 'deactivate',
            label: 'Desactivar acceso',
            icon: <UserMinus aria-hidden="true" className="size-3.5" />,
            permission: 'users.manage',
            hidden: (row) => !row.isActive,
            tone: 'danger',
            // Losing your own access mid-session is a self-inflicted lockout.
            disabled: (row) =>
              row.email === actor.email ? 'No puedes desactivar tu propia cuenta.' : false,
            confirm: {
              title: 'Desactivar acceso',
              description: (row) => (
                <>
                  <strong className="text-ink">{row.name}</strong> no podrá volver a entrar al
                  panel.
                </>
              ),
              consequence: () =>
                'Las sesiones activas se revocan. La bitácora conserva todo lo que esta cuenta hizo.',
              confirmLabel: 'Desactivar',
              typedConfirmation: (row) => row.email,
              requireReason: true,
            },
            run: (row, { reason }) => {
              setAdminUserActive(row.id, false)
              recordAudit({
                actorName: actor.name,
                actorEmail: actor.email,
                action: 'admin_user.deactivate',
                entityType: 'admin_user',
                entityId: row.id,
                entityLabel: row.email,
                before: { isActive: true },
                after: { isActive: false },
                reason,
              })
            },
          },
        ],
      }),
    [actor],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <Drawer
        open={drawerOpen}
        title={editing ? `Editar ${editing.name}` : 'Invitar usuario'}
        description="El rol decide qué pantallas ve; el alcance de mercados, sobre qué datos."
        onClose={() => {
          setDrawerOpen(false)
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDrawerOpen(false)
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="admin-user-form">
              {editing ? 'Guardar' : 'Enviar invitación'}
            </Button>
          </>
        }
      >
        {drawerOpen ? (
          <AdminUserForm
            key={editing?.id ?? 'new'}
            record={editing}
            actorName={actor.name}
            actorEmail={actor.email}
            onSaved={refresh}
            onClose={() => {
              setDrawerOpen(false)
            }}
          />
        ) : null}
      </Drawer>
    </>
  )
}

function AdminUserForm({
  record,
  actorName,
  actorEmail,
  onSaved,
  onClose,
}: {
  record: AdminUserRecord | null
  actorName: string
  actorEmail: string
  onSaved: () => void
  onClose: () => void
}) {
  const roles = listRoles()
  const markets = listMarkets()

  const [name, setName] = useState(record?.name ?? '')
  const [email, setEmail] = useState(record?.email ?? '')
  const [roleCode, setRoleCode] = useState(record?.roleCode ?? roles[0]?.code ?? '')
  const [scope, setScope] = useState<Set<string>>(() => new Set(record?.marketScope ?? []))
  const [error, setError] = useState<string | null>(null)

  const selectedRole = roles.find((role) => role.code === roleCode)

  const toggleMarket = (marketId: string) => {
    setScope((previous) => {
      const next = new Set(previous)
      if (next.has(marketId)) {
        next.delete(marketId)
      } else {
        next.add(marketId)
      }
      return next
    })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (name.trim() === '' || email.trim() === '') {
      setError('El nombre y el correo son obligatorios.')
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('El correo no tiene un formato válido.')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const clash = listAdminUsers().some(
      (other) => other.email === normalizedEmail && other.id !== record?.id,
    )
    if (clash) {
      setError('Ya existe un usuario con ese correo.')
      return
    }

    const next: AdminUserRecord = {
      id: record?.id ?? createAdminUserId(),
      name: name.trim(),
      email: normalizedEmail,
      roleCode,
      marketScope: Array.from(scope),
      totpEnabled: record?.totpEnabled ?? false,
      isActive: record?.isActive ?? true,
      lastLoginAt: record?.lastLoginAt ?? null,
      invitedAt: record?.invitedAt ?? new Date().toISOString(),
    }

    upsertAdminUser(next)
    recordAudit({
      actorName,
      actorEmail,
      action: record === null ? 'admin_user.invite' : 'admin_user.update',
      entityType: 'admin_user',
      entityId: next.id,
      entityLabel: next.email,
      before: record ? { roleCode: record.roleCode, marketScope: record.marketScope } : null,
      after: { roleCode: next.roleCode, marketScope: next.marketScope },
    })

    onSaved()
    onClose()
  }

  return (
    <form id="admin-user-form" onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field label="Nombre" required>
        {({ id }) => (
          <Input
            id={id}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
        )}
      </Field>

      <Field label="Correo" required hint="Recibirá la invitación para configurar su acceso.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="email"
            aria-describedby={describedBy}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError(null)
            }}
          />
        )}
      </Field>

      <Field label="Rol" required>
        {({ id }) => (
          <Select
            id={id}
            value={roleCode}
            onChange={(event) => {
              setRoleCode(event.target.value)
            }}
          >
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {selectedRole ? (
        <p className="-mt-2 text-xs text-ink-muted">{selectedRole.description}</p>
      ) : null}

      <fieldset className="grid gap-1.5 rounded-lg border border-border-base px-3 py-2.5">
        <legend className="px-1 text-xs font-semibold text-ink-muted">Alcance de mercados</legend>
        <p className="text-xs text-ink-muted">Sin selección, el usuario ve todos los mercados.</p>

        {markets
          .filter((market) => market.isLive)
          .map((market) => (
            <label key={market.id} className="flex items-center gap-2 text-sm text-ink">
              <Checkbox
                checked={scope.has(market.id)}
                onChange={() => {
                  toggleMarket(market.id)
                }}
              />
              {market.name}
              <span className="font-mono text-[11px] text-ink-subtle">{market.code}</span>
            </label>
          ))}
      </fieldset>

      <Alert tone="info" title="Verificación en dos pasos obligatoria">
        <span className="flex items-center gap-1.5">
          {record?.totpEnabled ? (
            <>
              <ShieldCheck aria-hidden="true" className="size-3.5" /> Ya configurada.
            </>
          ) : (
            <>
              <ShieldOff aria-hidden="true" className="size-3.5" /> Se configurará en el primer
              inicio de sesión.
            </>
          )}
        </span>
      </Alert>
    </form>
  )
}
