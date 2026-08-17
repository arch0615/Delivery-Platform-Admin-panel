/*
 * TREE OPERATIONS
 *
 * The category taxonomy is stored flat - `parent_id` plus `sort_order`, per
 * database schema.txt §5 - and assembled into a tree for display. Every
 * mutation below returns a new flat list, so what the screen edits is exactly
 * what the API will receive.
 *
 * Reparenting is where trees go wrong: moving a node into its own subtree
 * detaches that whole branch from the root and it silently disappears from
 * every listing. `canReparent` is the guard.
 */

export type TreeRow = {
  id: string
  parentId: string | null
  sortOrder: number
}

export type TreeNode<TRow extends TreeRow> = {
  row: TRow
  depth: number
  children: TreeNode<TRow>[]
}

function bySortOrder<TRow extends TreeRow>(a: TRow, b: TRow): number {
  return a.sortOrder - b.sortOrder
}

/**
 * Assemble a flat list into a forest.
 *
 * Rows whose parent is missing from the input are treated as roots rather than
 * dropped: a filtered view (one vertical) must not hide records, and silently
 * swallowing orphans makes a data problem invisible.
 */
export function buildTree<TRow extends TreeRow>(rows: readonly TRow[]): TreeNode<TRow>[] {
  const present = new Set(rows.map((row) => row.id))
  const childrenOf = new Map<string | null, TRow[]>()

  for (const row of rows) {
    const key = row.parentId !== null && present.has(row.parentId) ? row.parentId : null
    const bucket = childrenOf.get(key)
    if (bucket) {
      bucket.push(row)
    } else {
      childrenOf.set(key, [row])
    }
  }

  const build = (parentId: string | null, depth: number): TreeNode<TRow>[] =>
    [...(childrenOf.get(parentId) ?? [])].sort(bySortOrder).map((row) => ({
      row,
      depth,
      children: build(row.id, depth + 1),
    }))

  return build(null, 0)
}

/** Depth-first flatten, so the tree can render as table rows. */
export function flattenTree<TRow extends TreeRow>(
  nodes: readonly TreeNode<TRow>[],
  isCollapsed: (id: string) => boolean = () => false,
): TreeNode<TRow>[] {
  const out: TreeNode<TRow>[] = []

  const walk = (list: readonly TreeNode<TRow>[]) => {
    for (const node of list) {
      out.push(node)
      if (!isCollapsed(node.row.id)) {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return out
}

export function descendantIds<TRow extends TreeRow>(rows: readonly TRow[], id: string): string[] {
  const out: string[] = []
  const queue = [id]

  while (queue.length > 0) {
    const current = queue.pop()
    for (const row of rows) {
      if (row.parentId === current) {
        out.push(row.id)
        queue.push(row.id)
      }
    }
  }

  return out
}

/**
 * May `id` become a child of `parentId`?
 *
 * False for itself and for any of its own descendants - that would orphan the
 * branch. A null parent (promote to root) is always allowed.
 */
export function canReparent<TRow extends TreeRow>(
  rows: readonly TRow[],
  id: string,
  parentId: string | null,
): boolean {
  if (parentId === null) {
    return true
  }
  if (parentId === id) {
    return false
  }

  return !descendantIds(rows, id).includes(parentId)
}

/** Renumber a parent's children as 10, 20, 30 - leaving gaps to insert into. */
function renumberSiblings<TRow extends TreeRow>(rows: TRow[], parentId: string | null): TRow[] {
  const siblings = rows.filter((row) => row.parentId === parentId).sort(bySortOrder)

  const order = new Map(siblings.map((row, index) => [row.id, (index + 1) * 10]))

  return rows.map((row) => {
    const next = order.get(row.id)
    return next !== undefined && row.parentId === parentId ? { ...row, sortOrder: next } : row
  })
}

/** Swap a node with its previous or next sibling. */
export function moveSibling<TRow extends TreeRow>(
  rows: readonly TRow[],
  id: string,
  direction: 'up' | 'down',
): TRow[] {
  const target = rows.find((row) => row.id === id)
  if (!target) {
    return [...rows]
  }

  const siblings = rows.filter((row) => row.parentId === target.parentId).sort(bySortOrder)
  const index = siblings.findIndex((row) => row.id === id)
  const swapWith = direction === 'up' ? siblings[index - 1] : siblings[index + 1]

  if (!swapWith) {
    return [...rows]
  }

  const swapped = rows.map((row) => {
    if (row.id === target.id) {
      return { ...row, sortOrder: swapWith.sortOrder }
    }
    if (row.id === swapWith.id) {
      return { ...row, sortOrder: target.sortOrder }
    }
    return row
  })

  return renumberSiblings(swapped, target.parentId)
}

/**
 * Indent: become a child of the sibling immediately above.
 *
 * The natural keyboard gesture for nesting, and the reason drag-and-drop is
 * not required for a usable tree editor.
 */
export function indent<TRow extends TreeRow>(rows: readonly TRow[], id: string): TRow[] {
  const target = rows.find((row) => row.id === id)
  if (!target) {
    return [...rows]
  }

  const siblings = rows.filter((row) => row.parentId === target.parentId).sort(bySortOrder)
  const index = siblings.findIndex((row) => row.id === id)
  const newParent = siblings[index - 1]

  if (!newParent || !canReparent(rows, id, newParent.id)) {
    return [...rows]
  }

  const lastChildOrder = rows
    .filter((row) => row.parentId === newParent.id)
    .reduce((max, row) => Math.max(max, row.sortOrder), 0)

  const moved = rows.map((row) =>
    row.id === id ? { ...row, parentId: newParent.id, sortOrder: lastChildOrder + 10 } : row,
  )

  return renumberSiblings(renumberSiblings(moved, target.parentId), newParent.id)
}

/** Outdent: become the next sibling of the current parent. */
export function outdent<TRow extends TreeRow>(rows: readonly TRow[], id: string): TRow[] {
  const target = rows.find((row) => row.id === id)
  if (!target || target.parentId === null) {
    return [...rows]
  }

  const parent = rows.find((row) => row.id === target.parentId)
  if (!parent) {
    return [...rows]
  }

  const moved = rows.map((row) =>
    row.id === id ? { ...row, parentId: parent.parentId, sortOrder: parent.sortOrder + 5 } : row,
  )

  return renumberSiblings(renumberSiblings(moved, target.parentId), parent.parentId)
}

export function reparent<TRow extends TreeRow>(
  rows: readonly TRow[],
  id: string,
  parentId: string | null,
): TRow[] {
  if (!canReparent(rows, id, parentId)) {
    return [...rows]
  }

  const target = rows.find((row) => row.id === id)
  if (!target) {
    return [...rows]
  }

  const lastOrder = rows
    .filter((row) => row.parentId === parentId)
    .reduce((max, row) => Math.max(max, row.sortOrder), 0)

  const moved = rows.map((row) =>
    row.id === id ? { ...row, parentId, sortOrder: lastOrder + 10 } : row,
  )

  return renumberSiblings(renumberSiblings(moved, target.parentId), parentId)
}
