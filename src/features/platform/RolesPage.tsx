import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { useCurrentUser } from '@/app/session-context'
import { Alert, Badge, Button, Checkbox, Drawer, Field, Input } from '@/components/ui'
import { ResourceListPage, defineResource } from '@/framework'
import { countUsersWithRole } from '@/lib/admin-users'
import { recordAudit } from '@/lib/audit'
import { queryCollection } from '@/lib/mock-api'
import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  WILDCARD,
  hasPermission,
  type Permission,
  type Role,
} from '@/lib/permissions'
import { deleteRole, isProtectedRole, listRoles, upsertRole } from '@/lib/roles'

/*
 * A-013 Roles and permissions.
 *
 * Roles are data, so a new one needs no deploy. The editor works against the
 * permission catalogue rather than free text: a typo in a permission string is
 * silent - the screens it guards simply never appear for anyone holding it.
 */

const RESOURCE_KEY = 'roles'

export function RolesPage() {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()
  const [editing, setEditing] = useState<Role | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [RESOURCE_KEY] })
  }

  const config = useMemo(
    () =>
      defineResource<Role>({
        key: RESOURCE_KEY,
        title: 'Roles y permisos',
        description:
          'Un rol agrupa permisos. Ocultar una pantalla es experiencia de usuario; el servidor vuelve a validar cada petición.',
        permission: 'users.manage',
        getRowId: (row) => row.code,
        searchPlaceholder: 'Buscar rol…',
        defaultSort: { id: 'name', direction: 'asc' },

        columns: [
          {
            id: 'name',
            header: 'Rol',
            sortable: true,
            cell: (row) => (
              <span className="flex items-center gap-2">
                <span className="font-medium">{row.name}</span>
                {isProtectedRole(row.code) ? <Badge tone="accent">Protegido</Badge> : null}
              </span>
            ),
            exportValue: (row) => row.name,
          },
          {
            id: 'code',
            header: 'Código',
            sortable: true,
            className: 'font-mono text-xs',
            cell: (row) => row.code,
            exportValue: (row) => row.code,
          },
          {
            id: 'description',
            header: 'Descripción',
            cell: (row) => <span className="text-xs text-ink-muted">{row.description}</span>,
            exportValue: (row) => row.description,
          },
          {
            id: 'permissions',
            header: 'Permisos',
            numeric: true,
            cell: (row) =>
              row.permissions.includes(WILDCARD) ? (
                <Badge tone="warning">Todos</Badge>
              ) : (
                <span>
                  {row.permissions.filter((p) => !p.endsWith('.*')).length +
                    row.permissions.filter((p) => p.endsWith('.*')).length}
                </span>
              ),
            exportValue: (row) => row.permissions.join(' '),
          },
          {
            id: 'users',
            header: 'Usuarios',
            numeric: true,
            sortable: true,
            cell: (row) => countUsersWithRole(row.code),
            exportValue: (row) => countUsersWithRole(row.code),
          },
        ],

        fetch: (query) =>
          queryCollection(listRoles(), query, {
            searchFields: (row) => [row.name, row.code, row.description],
            sortValues: (row) => ({
              name: row.name,
              code: row.code,
              users: countUsersWithRole(row.code),
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
            Nuevo rol
          </Button>
        ),

        rowActions: [
          {
            id: 'edit',
            label: 'Editar permisos',
            icon: <Pencil aria-hidden="true" className="size-3.5" />,
            permission: 'users.manage',
            run: (row) => {
              setEditing(row)
              setDrawerOpen(true)
            },
          },
          {
            id: 'delete',
            label: 'Eliminar rol',
            icon: <Trash2 aria-hidden="true" className="size-3.5" />,
            permission: 'users.manage',
            tone: 'danger',
            // Deleting super_admin, or a role still in use, locks people out.
            disabled: (row) =>
              isProtectedRole(row.code)
                ? 'El rol de administrador general no se puede eliminar.'
                : countUsersWithRole(row.code) > 0
                  ? `${countUsersWithRole(row.code)} usuario(s) tienen este rol.`
                  : false,
            confirm: {
              title: 'Eliminar rol',
              description: (row) => (
                <>
                  Se eliminará el rol <strong className="text-ink">{row.name}</strong>.
                </>
              ),
              consequence: () =>
                'Cualquier usuario que quede con este rol perderá todo acceso hasta que se le asigne otro.',
              confirmLabel: 'Eliminar rol',
              typedConfirmation: (row) => row.code,
              requireReason: true,
            },
            run: (row, { reason }) => {
              deleteRole(row.code)
              recordAudit({
                actorName: user.name,
                actorEmail: user.email,
                action: 'role.delete',
                entityType: 'role',
                entityId: row.code,
                entityLabel: row.name,
                before: { permissions: row.permissions },
                after: null,
                reason,
              })
            },
          },
        ],
      }),
    [user],
  )

  return (
    <>
      <ResourceListPage config={config} />

      <Drawer
        open={drawerOpen}
        title={editing ? `Editar rol: ${editing.name}` : 'Nuevo rol'}
        description="Marca los permisos que este rol debe otorgar."
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
            <Button
              variant="primary"
              type="submit"
              form="role-form"
              disabled={editing !== null && isProtectedRole(editing.code)}
            >
              {editing ? 'Guardar' : 'Crear rol'}
            </Button>
          </>
        }
      >
        {drawerOpen ? (
          <RoleForm
            key={editing?.code ?? 'new'}
            role={editing}
            actorName={user.name}
            actorEmail={user.email}
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

function RoleForm({
  role,
  actorName,
  actorEmail,
  onSaved,
  onClose,
}: {
  role: Role | null
  actorName: string
  actorEmail: string
  onSaved: () => void
  onClose: () => void
}) {
  const protectedRole = role !== null && isProtectedRole(role.code)

  const [name, setName] = useState(role?.name ?? '')
  const [code, setCode] = useState(role?.code ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [granted, setGranted] = useState<Set<Permission>>(() => expand(role?.permissions ?? []))
  const [error, setError] = useState<string | null>(null)

  const toggle = (permission: Permission) => {
    setGranted((previous) => {
      const next = new Set(previous)
      if (next.has(permission)) {
        next.delete(permission)
      } else {
        next.add(permission)
      }
      return next
    })
  }

  const toggleDomain = (permissions: Permission[], on: boolean) => {
    setGranted((previous) => {
      const next = new Set(previous)
      for (const permission of permissions) {
        if (on) {
          next.add(permission)
        } else {
          next.delete(permission)
        }
      }
      return next
    })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (protectedRole) {
      return
    }
    if (name.trim() === '' || code.trim() === '') {
      setError('El nombre y el código son obligatorios.')
      return
    }
    if (granted.size === 0) {
      // A role with nothing granted looks assigned but reaches nothing, which
      // reads to the user as the panel being broken.
      setError('Selecciona al menos un permiso: un rol sin permisos no puede abrir nada.')
      return
    }

    const trimmedCode = code.trim().toLowerCase().replace(/\s+/g, '_')

    if (role === null && listRoles().some((existing) => existing.code === trimmedCode)) {
      setError('Ya existe un rol con ese código.')
      return
    }

    const next: Role = {
      code: trimmedCode,
      name: name.trim(),
      description: description.trim(),
      permissions: Array.from(granted).sort(),
    }

    upsertRole(next)
    recordAudit({
      actorName,
      actorEmail,
      action: role === null ? 'role.create' : 'role.update',
      entityType: 'role',
      entityId: next.code,
      entityLabel: next.name,
      before: role ? { permissions: role.permissions } : null,
      after: { permissions: next.permissions },
    })

    onSaved()
    onClose()
  }

  return (
    <form id="role-form" onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {protectedRole ? (
        <Alert tone="warning" title="Rol protegido">
          El administrador general tiene el permiso comodín. No puede editarse: quitarle acceso es
          cómo una organización se queda fuera de su propia plataforma.
        </Alert>
      ) : null}

      <Field label="Nombre" required>
        {({ id }) => (
          <Input
            id={id}
            value={name}
            disabled={protectedRole}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder="Operaciones nocturnas"
          />
        )}
      </Field>

      <Field label="Código" required hint="Identificador estable.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            value={code}
            disabled={protectedRole || role !== null}
            onChange={(event) => {
              setCode(event.target.value)
              setError(null)
            }}
            placeholder="ops_nocturno"
            className="font-mono"
          />
        )}
      </Field>

      <Field label="Descripción">
        {({ id }) => (
          <Input
            id={id}
            value={description}
            disabled={protectedRole}
            onChange={(event) => {
              setDescription(event.target.value)
            }}
          />
        )}
      </Field>

      <div className="grid gap-3">
        <p className="text-sm font-medium text-ink">
          Permisos{' '}
          <span className="font-normal text-ink-muted">
            ({granted.size} de {ALL_PERMISSIONS.length})
          </span>
        </p>

        {PERMISSION_CATALOG.map((domain) => {
          const keys = domain.permissions.map((permission) => permission.key)
          const allOn = keys.every((key) => granted.has(key))

          return (
            <fieldset
              key={domain.id}
              className="grid gap-1.5 rounded-lg border border-border-base px-3 py-2.5"
            >
              <legend className="px-1 text-xs font-semibold text-ink-muted">{domain.label}</legend>

              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <Checkbox
                  checked={allOn}
                  disabled={protectedRole}
                  onChange={(event) => {
                    toggleDomain(keys, event.target.checked)
                  }}
                />
                Seleccionar todo
              </label>

              {domain.permissions.map((permission) => (
                <label
                  key={permission.key}
                  className="flex items-start gap-2 border-t border-border-base pt-1.5 text-sm text-ink"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={granted.has(permission.key)}
                    disabled={protectedRole}
                    onChange={() => {
                      toggle(permission.key)
                      setError(null)
                    }}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      {permission.label}
                      {permission.sensitive ? (
                        <ShieldAlert
                          aria-label="Permiso sensible"
                          className="size-3 text-warning"
                        />
                      ) : null}
                    </span>
                    <span className="block font-mono text-[11px] text-ink-subtle">
                      {permission.key}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )
        })}
      </div>
    </form>
  )
}

/**
 * Turn stored permissions into concrete checkboxes.
 *
 * Stored roles may use '*' or 'finance.*'; the editor works in explicit keys so
 * what is ticked is exactly what is granted, with nothing implied.
 */
function expand(permissions: readonly Permission[]): Set<Permission> {
  return new Set(ALL_PERMISSIONS.filter((key) => hasPermission(permissions, key)))
}
