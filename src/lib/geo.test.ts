import { describe, expect, it } from 'vitest'

import {
  boundingBox,
  closeRing,
  openRing,
  pointInRing,
  ringAreaKm2,
  ringCentroid,
  ringSelfIntersects,
  ringsOverlap,
  segmentsIntersect,
  validateRing,
  type Ring,
} from '@/lib/geo'

/** Roughly the Cuauhtémoc area of Mexico City. */
const CUAUHTEMOC: Ring = [
  [-99.17, 19.42],
  [-99.13, 19.42],
  [-99.13, 19.45],
  [-99.17, 19.45],
]

/** Adjacent to the east, sharing an edge but not overlapping. */
const ADJACENT: Ring = [
  [-99.13, 19.42],
  [-99.09, 19.42],
  [-99.09, 19.45],
  [-99.13, 19.45],
]

/** Overlaps the western half of CUAUHTEMOC. */
const OVERLAPPING: Ring = [
  [-99.19, 19.43],
  [-99.15, 19.43],
  [-99.15, 19.44],
  [-99.19, 19.44],
]

/** Entirely inside CUAUHTEMOC. */
const CONTAINED: Ring = [
  [-99.16, 19.43],
  [-99.15, 19.43],
  [-99.15, 19.44],
  [-99.16, 19.44],
]

/** Far away - Guadalajara. */
const FAR_AWAY: Ring = [
  [-103.4, 20.65],
  [-103.3, 20.65],
  [-103.3, 20.72],
  [-103.4, 20.72],
]

describe('closeRing / openRing', () => {
  it('closes an open ring', () => {
    const closed = closeRing(CUAUHTEMOC)
    expect(closed).toHaveLength(5)
    expect(closed[0]).toEqual(closed[4])
  })

  it('leaves an already closed ring alone', () => {
    expect(closeRing(closeRing(CUAUHTEMOC))).toHaveLength(5)
  })

  it('round-trips', () => {
    expect(openRing(closeRing(CUAUHTEMOC))).toEqual(CUAUHTEMOC)
  })
})

describe('ringAreaKm2', () => {
  it('measures a city-sized box within a few percent', () => {
    // 0.04 deg lon x 0.03 deg lat at latitude 19.4:
    //   lon: 0.04 * 111.32 * cos(19.4) ~= 4.20 km
    //   lat: 0.03 * 110.57            ~= 3.32 km  -> ~13.9 km2
    const area = ringAreaKm2(CUAUHTEMOC)
    expect(area).toBeGreaterThan(13)
    expect(area).toBeLessThan(15)
  })

  it('is independent of winding direction', () => {
    const reversed = [...CUAUHTEMOC].reverse()
    expect(ringAreaKm2(reversed)).toBeCloseTo(ringAreaKm2(CUAUHTEMOC), 6)
  })

  it('returns zero for a degenerate ring', () => {
    expect(ringAreaKm2([])).toBe(0)
    expect(
      ringAreaKm2([
        [-99.17, 19.42],
        [-99.13, 19.42],
      ]),
    ).toBe(0)
  })
})

describe('pointInRing', () => {
  it('detects a point inside', () => {
    expect(pointInRing([-99.15, 19.43], CUAUHTEMOC)).toBe(true)
  })

  it('detects points outside, including just beyond each edge', () => {
    expect(pointInRing([-99.2, 19.43], CUAUHTEMOC)).toBe(false)
    expect(pointInRing([-99.1, 19.43], CUAUHTEMOC)).toBe(false)
    expect(pointInRing([-99.15, 19.41], CUAUHTEMOC)).toBe(false)
    expect(pointInRing([-99.15, 19.46], CUAUHTEMOC)).toBe(false)
  })

  it('handles a concave ring, where a bounding box would be wrong', () => {
    // A C-shape: the notch is inside the bounding box but outside the ring.
    const cShape: Ring = [
      [0, 0],
      [4, 0],
      [4, 1],
      [1, 1],
      [1, 3],
      [4, 3],
      [4, 4],
      [0, 4],
    ]

    expect(pointInRing([0.5, 2], cShape)).toBe(true)
    expect(pointInRing([3, 2], cShape)).toBe(false)
  })
})

describe('segmentsIntersect', () => {
  it('detects a crossing', () => {
    expect(segmentsIntersect([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true)
  })

  it('reports parallel segments as not intersecting', () => {
    expect(segmentsIntersect([0, 0], [2, 0], [0, 1], [2, 1])).toBe(false)
  })

  it('detects touching endpoints', () => {
    expect(segmentsIntersect([0, 0], [1, 1], [1, 1], [2, 0])).toBe(true)
  })
})

describe('ringSelfIntersects', () => {
  it('accepts a simple ring', () => {
    expect(ringSelfIntersects(CUAUHTEMOC)).toBe(false)
  })

  it('accepts a concave but simple ring', () => {
    expect(
      ringSelfIntersects([
        [0, 0],
        [4, 0],
        [4, 4],
        [2, 2],
        [0, 4],
      ]),
    ).toBe(false)
  })

  it('rejects a bow-tie', () => {
    // PostGIS rejects this, so the editor has to catch it before saving.
    expect(
      ringSelfIntersects([
        [0, 0],
        [2, 2],
        [2, 0],
        [0, 2],
      ]),
    ).toBe(true)
  })
})

describe('ringsOverlap', () => {
  it('is false for distant rings', () => {
    expect(ringsOverlap(CUAUHTEMOC, FAR_AWAY)).toBe(false)
  })

  it('is true when edges cross', () => {
    expect(ringsOverlap(CUAUHTEMOC, OVERLAPPING)).toBe(true)
  })

  it('is true when one ring contains the other, with no crossing edges', () => {
    expect(ringsOverlap(CUAUHTEMOC, CONTAINED)).toBe(true)
    expect(ringsOverlap(CONTAINED, CUAUHTEMOC)).toBe(true)
  })

  it('is symmetric', () => {
    expect(ringsOverlap(OVERLAPPING, CUAUHTEMOC)).toBe(ringsOverlap(CUAUHTEMOC, OVERLAPPING))
  })

  it('treats a shared edge as touching', () => {
    // Adjacent zones tiling a city share a border; that is expected and the
    // operator should be told, since priority decides which one wins.
    expect(ringsOverlap(CUAUHTEMOC, ADJACENT)).toBe(true)
  })
})

describe('boundingBox and centroid', () => {
  it('computes the bounds', () => {
    expect(boundingBox(CUAUHTEMOC)).toEqual({
      minLon: -99.17,
      minLat: 19.42,
      maxLon: -99.13,
      maxLat: 19.45,
    })
  })

  it('computes a centroid inside a convex ring', () => {
    const centroid = ringCentroid(CUAUHTEMOC)
    expect(pointInRing(centroid, CUAUHTEMOC)).toBe(true)
  })
})

describe('validateRing', () => {
  it('accepts a normal zone', () => {
    expect(validateRing(CUAUHTEMOC)).toEqual({ valid: true, errors: [] })
  })

  it('rejects fewer than three points', () => {
    const result = validateRing([
      [-99.17, 19.42],
      [-99.13, 19.42],
    ])
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/al menos 3 puntos/)
  })

  it('rejects a self-intersecting ring', () => {
    const result = validateRing([
      [0, 0],
      [2, 2],
      [2, 0],
      [0, 2],
    ])
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => /se cruza/.test(error))).toBe(true)
  })

  it('rejects a ring too small to be a delivery zone', () => {
    const tiny: Ring = [
      [-99.1701, 19.4201],
      [-99.17, 19.4201],
      [-99.17, 19.42],
      [-99.1701, 19.42],
    ]
    const result = validateRing(tiny)
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => /demasiado pequeña/.test(error))).toBe(true)
  })
})
