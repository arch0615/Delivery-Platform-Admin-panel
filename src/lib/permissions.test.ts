import { describe, expect, it } from 'vitest'

import { NAV_GROUPS, NAV_HOME } from '@/app/nav'
import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  ROLES,
  hasAnyPermission,
  hasPermission,
} from '@/lib/permissions'

describe('hasPermission', () => {
  it('matches exactly', () => {
    expect(hasPermission(['finance.view'], 'finance.view')).toBe(true)
    expect(hasPermission(['finance.view'], 'finance.payouts')).toBe(false)
  })

  it('grants everything with the wildcard', () => {
    expect(hasPermission(['*'], 'finance.payouts')).toBe(true)
    expect(hasPermission(['*'], 'anything.at.all')).toBe(true)
  })

  it('grants a whole domain with a domain wildcard', () => {
    expect(hasPermission(['finance.*'], 'finance.payouts')).toBe(true)
    expect(hasPermission(['finance.*'], 'finance.ledger')).toBe(true)
  })

  it('does not let a domain wildcard leak into a similarly named domain', () => {
    // 'finance.*' must not grant 'financex.view' via a naive prefix check.
    expect(hasPermission(['finance.*'], 'financex.view')).toBe(false)
    expect(hasPermission(['orders.*'], 'ordersadmin.view')).toBe(false)
  })

  it('returns false for an empty permission set', () => {
    expect(hasPermission([], 'orders.view')).toBe(false)
    expect(hasAnyPermission([], ['orders.view', 'finance.view'])).toBe(false)
  })

  it('hasAnyPermission needs only one match', () => {
    expect(hasAnyPermission(['support.view'], ['finance.view', 'support.view'])).toBe(true)
    expect(hasAnyPermission(['support.view'], ['finance.view', 'orders.refund'])).toBe(false)
  })
})

describe('permission catalogue', () => {
  it('contains every permission the navigation requires', () => {
    // A permission the catalogue does not list is one nobody can grant, so the
    // screens it guards are unreachable forever - and nothing would say so.
    const required = [NAV_HOME, ...NAV_GROUPS.flatMap((group) => group.items)].map(
      (item) => item.permission,
    )

    const missing = required.filter((permission) => !ALL_PERMISSIONS.includes(permission))
    expect(missing).toEqual([])
  })

  it('grants every catalogued permission to super_admin via the wildcard', () => {
    const denied = ALL_PERMISSIONS.filter(
      (permission) => !hasPermission(ROLES.super_admin.permissions, permission),
    )
    expect(denied).toEqual([])
  })

  it('has no duplicate permission keys', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length)
  })

  it('names every permission in domain.action form', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(permission).toMatch(/^[a-z_]+\.[a-z_]+$/)
    }
  })

  it('gives every domain a label and at least one permission', () => {
    for (const domain of PERMISSION_CATALOG) {
      expect(domain.label.length).toBeGreaterThan(0)
      expect(domain.permissions.length).toBeGreaterThan(0)
    }
  })

  it('marks the money-moving permissions as sensitive', () => {
    const mustBeSensitive = [
      'finance.refunds',
      'finance.payouts',
      'finance.settlements',
      'commission.manage',
      'users.manage',
    ]

    for (const key of mustBeSensitive) {
      const definition = PERMISSION_CATALOG.flatMap((domain) => domain.permissions).find(
        (permission) => permission.key === key,
      )
      expect(definition?.sensitive, `${key} should be marked sensitive`).toBe(true)
    }
  })
})

/** Mirrors the filtering the sidebar applies. */
function visibleGroupIds(roleCode: keyof typeof ROLES): string[] {
  const granted = ROLES[roleCode].permissions

  return NAV_GROUPS.filter((group) =>
    group.items.some((item) => hasPermission(granted, item.permission)),
  ).map((group) => group.id)
}

describe('navigation visibility by role', () => {
  it('shows every group to super_admin', () => {
    expect(visibleGroupIds('super_admin')).toHaveLength(NAV_GROUPS.length)
  })

  it('hides Finanzas from support entirely', () => {
    // Acceptance criterion for A-003: a support role sees no Finanzas group at
    // all, not a greyed-out one.
    expect(visibleGroupIds('support')).not.toContain('finance')
    expect(visibleGroupIds('support')).toContain('support')
  })

  it('hides Finanzas and Cumplimiento from ops', () => {
    const groups = visibleGroupIds('ops')
    expect(groups).not.toContain('finance')
    expect(groups).not.toContain('compliance')
    expect(groups).toContain('operations')
  })

  it('gives finance the money sections but not compliance or support', () => {
    const groups = visibleGroupIds('finance')
    expect(groups).toContain('finance')
    expect(groups).toContain('pricing')
    expect(groups).not.toContain('compliance')
    expect(groups).not.toContain('support')
  })

  it('gives compliance its own section without finance', () => {
    const groups = visibleGroupIds('compliance')
    expect(groups).toContain('compliance')
    expect(groups).not.toContain('finance')
  })

  it('never shows read_only anything outside its view permissions', () => {
    const groups = visibleGroupIds('read_only')
    expect(groups).not.toContain('finance')
    expect(groups).not.toContain('compliance')
    expect(groups).not.toContain('platform')
  })
})
