import { describe, expect, it } from 'vitest'

import {
  buildTree,
  canReparent,
  descendantIds,
  flattenTree,
  indent,
  moveSibling,
  outdent,
  reparent,
  type TreeRow,
} from '@/lib/tree'

type Row = TreeRow & { name: string }

/*
 *  a (10)
 *    a1 (10)
 *    a2 (20)
 *      a2x (10)
 *  b (20)
 *  c (30)
 */
const ROWS: Row[] = [
  { id: 'a', parentId: null, sortOrder: 10, name: 'a' },
  { id: 'a1', parentId: 'a', sortOrder: 10, name: 'a1' },
  { id: 'a2', parentId: 'a', sortOrder: 20, name: 'a2' },
  { id: 'a2x', parentId: 'a2', sortOrder: 10, name: 'a2x' },
  { id: 'b', parentId: null, sortOrder: 20, name: 'b' },
  { id: 'c', parentId: null, sortOrder: 30, name: 'c' },
]

const ids = (rows: readonly Row[]) => rows.map((row) => row.id)

/** Depth-first order with depth, which is what the screen renders. */
function outline(rows: readonly Row[]): string[] {
  return flattenTree(buildTree(rows)).map((node) => `${'  '.repeat(node.depth)}${node.row.id}`)
}

describe('buildTree', () => {
  it('nests children under parents, ordered by sortOrder', () => {
    expect(outline(ROWS)).toEqual(['a', '  a1', '  a2', '    a2x', 'b', 'c'])
  })

  it('orders by sortOrder rather than array position', () => {
    const shuffled = [...ROWS].reverse()
    expect(outline(shuffled)).toEqual(outline(ROWS))
  })

  it('treats a row whose parent is absent as a root', () => {
    // A filtered view must not hide records. Swallowing orphans would make a
    // data problem invisible instead of visible.
    const partial = ROWS.filter((row) => row.id !== 'a')
    expect(outline(partial)).toEqual(['a1', 'a2', '  a2x', 'b', 'c'])
  })

  it('returns an empty forest for no rows', () => {
    expect(buildTree([])).toEqual([])
  })
})

describe('flattenTree', () => {
  it('hides the children of a collapsed node', () => {
    const flat = flattenTree(buildTree(ROWS), (id) => id === 'a')
    expect(flat.map((node) => node.row.id)).toEqual(['a', 'b', 'c'])
  })

  it('hides only below the collapsed node', () => {
    const flat = flattenTree(buildTree(ROWS), (id) => id === 'a2')
    expect(flat.map((node) => node.row.id)).toEqual(['a', 'a1', 'a2', 'b', 'c'])
  })
})

describe('descendantIds', () => {
  it('collects every level below a node', () => {
    expect(descendantIds(ROWS, 'a').sort()).toEqual(['a1', 'a2', 'a2x'])
  })

  it('is empty for a leaf', () => {
    expect(descendantIds(ROWS, 'a2x')).toEqual([])
  })
})

describe('canReparent', () => {
  it('allows an unrelated parent', () => {
    expect(canReparent(ROWS, 'b', 'a')).toBe(true)
  })

  it('always allows promotion to root', () => {
    expect(canReparent(ROWS, 'a2x', null)).toBe(true)
  })

  it('refuses a node as its own parent', () => {
    expect(canReparent(ROWS, 'a', 'a')).toBe(false)
  })

  it('refuses moving a node into its own descendant', () => {
    // This would detach the whole branch from the root and it would vanish
    // from every listing.
    expect(canReparent(ROWS, 'a', 'a1')).toBe(false)
    expect(canReparent(ROWS, 'a', 'a2x')).toBe(false)
  })
})

describe('moveSibling', () => {
  it('moves a root node up', () => {
    expect(outline(moveSibling(ROWS, 'b', 'up'))).toEqual([
      'b',
      'a',
      '  a1',
      '  a2',
      '    a2x',
      'c',
    ])
  })

  it('moves a root node down', () => {
    expect(outline(moveSibling(ROWS, 'a', 'down'))).toEqual([
      'b',
      'a',
      '  a1',
      '  a2',
      '    a2x',
      'c',
    ])
  })

  it('reorders within a parent without escaping it', () => {
    expect(outline(moveSibling(ROWS, 'a2', 'up'))).toEqual([
      'a',
      '  a2',
      '    a2x',
      '  a1',
      'b',
      'c',
    ])
  })

  it('does nothing at the ends', () => {
    expect(outline(moveSibling(ROWS, 'a', 'up'))).toEqual(outline(ROWS))
    expect(outline(moveSibling(ROWS, 'c', 'down'))).toEqual(outline(ROWS))
  })

  it('leaves sort orders evenly spaced', () => {
    const moved = moveSibling(ROWS, 'b', 'up')
    const roots = moved
      .filter((row) => row.parentId === null)
      .sort((x, y) => x.sortOrder - y.sortOrder)
    expect(roots.map((row) => row.sortOrder)).toEqual([10, 20, 30])
  })
})

describe('indent', () => {
  it('nests a node under the sibling above it', () => {
    expect(outline(indent(ROWS, 'b'))).toEqual(['a', '  a1', '  a2', '    a2x', '  b', 'c'])
  })

  it('does nothing for the first sibling', () => {
    expect(outline(indent(ROWS, 'a'))).toEqual(outline(ROWS))
    expect(outline(indent(ROWS, 'a1'))).toEqual(outline(ROWS))
  })

  it('keeps the moved node at the end of its new parent', () => {
    const moved = indent(ROWS, 'b')
    const children = moved
      .filter((row) => row.parentId === 'a')
      .sort((x, y) => x.sortOrder - y.sortOrder)
    expect(ids(children)).toEqual(['a1', 'a2', 'b'])
  })
})

describe('outdent', () => {
  it('promotes a child to sit after its old parent', () => {
    expect(outline(outdent(ROWS, 'a1'))).toEqual(['a', '  a2', '    a2x', 'a1', 'b', 'c'])
  })

  it('promotes a grandchild one level only', () => {
    expect(outline(outdent(ROWS, 'a2x'))).toEqual(['a', '  a1', '  a2', '  a2x', 'b', 'c'])
  })

  it('does nothing for a root node', () => {
    expect(outline(outdent(ROWS, 'a'))).toEqual(outline(ROWS))
  })

  it('round-trips with indent', () => {
    expect(outline(outdent(indent(ROWS, 'b'), 'b'))).toEqual(outline(ROWS))
  })
})

describe('reparent', () => {
  it('moves a subtree with its children intact', () => {
    expect(outline(reparent(ROWS, 'a2', 'b'))).toEqual(['a', '  a1', 'b', '  a2', '    a2x', 'c'])
  })

  it('promotes to root', () => {
    expect(outline(reparent(ROWS, 'a2x', null))).toEqual(['a', '  a1', '  a2', 'b', 'c', 'a2x'])
  })

  it('refuses a cycle and leaves the tree untouched', () => {
    expect(outline(reparent(ROWS, 'a', 'a2x'))).toEqual(outline(ROWS))
  })

  it('never loses or duplicates a row', () => {
    const moved = reparent(ROWS, 'a2', 'c')
    expect(moved).toHaveLength(ROWS.length)
    expect(ids(moved).sort()).toEqual(ids(ROWS).sort())
  })
})
