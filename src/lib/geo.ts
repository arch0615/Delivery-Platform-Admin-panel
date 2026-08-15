/*
 * GEOMETRY
 *
 * Delivery zones are MULTIPOLYGON in PostGIS (database schema.txt §2). The
 * server is the authority on geometry; these helpers exist so the editor can
 * warn before saving rather than after - an overlapping or self-intersecting
 * zone silently changes which merchants a customer sees.
 *
 * Coordinates are [longitude, latitude] throughout, matching GeoJSON. Getting
 * that order backwards is the single most common bug in mapping code, so the
 * type is named to make it obvious.
 */

/** [longitude, latitude] - GeoJSON order, NOT lat/lng. */
export type Position = [number, number]

/** A closed linear ring. First and last positions are equal. */
export type Ring = Position[]

export const EARTH_RADIUS_METERS = 6_371_008.8

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function at(ring: Ring, index: number): Position {
  const position = ring[index]
  if (!position) {
    throw new RangeError(`Ring index ${index} out of range`)
  }
  return position
}

/** Appends the first position if the ring is not already closed. */
export function closeRing(ring: Ring): Ring {
  if (ring.length < 3) {
    return ring
  }

  const first = at(ring, 0)
  const last = at(ring, ring.length - 1)

  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, [first[0], first[1]]]
}

/** Drops the duplicated closing position, if present. */
export function openRing(ring: Ring): Ring {
  if (ring.length < 2) {
    return ring
  }

  const first = at(ring, 0)
  const last = at(ring, ring.length - 1)

  return first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring
}

/**
 * Spherical polygon area in square metres.
 *
 * Uses the spherical excess formula rather than a planar shoelace: a zone
 * spanning a city is large enough that treating degrees as flat units
 * misreports area by several percent, which matters when it is shown to an
 * operator as a sanity check.
 */
export function ringAreaMeters(ring: Ring): number {
  const closed = closeRing(ring)
  if (closed.length < 4) {
    return 0
  }

  let total = 0

  for (let i = 0; i < closed.length - 1; i += 1) {
    const [lon1, lat1] = at(closed, i)
    const [lon2, lat2] = at(closed, i + 1)

    total += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)))
  }

  return Math.abs((total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2)
}

export function ringAreaKm2(ring: Ring): number {
  return ringAreaMeters(ring) / 1_000_000
}

/**
 * Ray casting point-in-polygon.
 *
 * Points exactly on an edge are not guaranteed either way; PostGIS decides at
 * the boundary, and this is only used for editor previews.
 */
export function pointInRing(point: Position, ring: Ring): boolean {
  const closed = closeRing(ring)
  const [x, y] = point
  let inside = false

  for (let i = 0, j = closed.length - 1; i < closed.length; j = i, i += 1) {
    const [xi, yi] = at(closed, i)
    const [xj, yj] = at(closed, j)

    const straddles = yi > y !== yj > y
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

export type BoundingBox = { minLon: number; minLat: number; maxLon: number; maxLat: number }

export function boundingBox(ring: Ring): BoundingBox {
  if (ring.length === 0) {
    return { minLon: 0, minLat: 0, maxLon: 0, maxLat: 0 }
  }

  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  return { minLon, minLat, maxLon, maxLat }
}

function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.maxLon < b.minLon || b.maxLon < a.minLon || a.maxLat < b.minLat || b.maxLat < a.minLat)
}

function orientation(p: Position, q: Position, r: Position): number {
  const value = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
  if (value === 0) {
    return 0
  }
  return value > 0 ? 1 : 2
}

function onSegment(p: Position, q: Position, r: Position): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) &&
    q[0] >= Math.min(p[0], r[0]) &&
    q[1] <= Math.max(p[1], r[1]) &&
    q[1] >= Math.min(p[1], r[1])
  )
}

export function segmentsIntersect(p1: Position, q1: Position, p2: Position, q2: Position): boolean {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) {
    return true
  }

  // Collinear cases.
  if (o1 === 0 && onSegment(p1, p2, q1)) return true
  if (o2 === 0 && onSegment(p1, q2, q1)) return true
  if (o3 === 0 && onSegment(p2, p1, q2)) return true
  if (o4 === 0 && onSegment(p2, q1, q2)) return true

  return false
}

/**
 * Does the ring cross itself?
 *
 * A bow-tie ring is accepted by the browser and rendered without complaint,
 * but PostGIS rejects it and the zone silently fails to save. Catching it in
 * the editor is the difference between a warning and a support ticket.
 */
export function ringSelfIntersects(ring: Ring): boolean {
  const open = openRing(ring)
  if (open.length < 4) {
    return false
  }

  const edges: Array<[Position, Position]> = []
  for (let i = 0; i < open.length; i += 1) {
    edges.push([at(open, i), at(open, (i + 1) % open.length)])
  }

  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      // Skip edges that legitimately share a vertex.
      const adjacent = j === i + 1 || (i === 0 && j === edges.length - 1)
      if (adjacent) {
        continue
      }

      const a = edges[i]
      const b = edges[j]
      if (a && b && segmentsIntersect(a[0], a[1], b[0], b[1])) {
        return true
      }
    }
  }

  return false
}

/**
 * Do two rings overlap?
 *
 * Edges crossing, or either ring wholly containing the other. Overlapping
 * zones are legal - the `priority` column breaks the tie - but the operator
 * has to be told, because an unnoticed overlap silently reroutes orders.
 */
export function ringsOverlap(a: Ring, b: Ring): boolean {
  if (a.length < 3 || b.length < 3) {
    return false
  }

  if (!boxesOverlap(boundingBox(a), boundingBox(b))) {
    return false
  }

  const closedA = closeRing(a)
  const closedB = closeRing(b)

  for (let i = 0; i < closedA.length - 1; i += 1) {
    for (let j = 0; j < closedB.length - 1; j += 1) {
      if (
        segmentsIntersect(at(closedA, i), at(closedA, i + 1), at(closedB, j), at(closedB, j + 1))
      ) {
        return true
      }
    }
  }

  // No crossings: one may still sit entirely inside the other.
  return pointInRing(at(closedA, 0), closedB) || pointInRing(at(closedB, 0), closedA)
}

export function ringCentroid(ring: Ring): Position {
  const open = openRing(ring)
  if (open.length === 0) {
    return [0, 0]
  }

  let lon = 0
  let lat = 0
  for (const [x, y] of open) {
    lon += x
    lat += y
  }

  return [lon / open.length, lat / open.length]
}

export type RingValidation = {
  valid: boolean
  errors: string[]
}

export function validateRing(ring: Ring): RingValidation {
  const errors: string[] = []
  const open = openRing(ring)

  if (open.length < 3) {
    errors.push('Una zona necesita al menos 3 puntos.')
  }
  if (open.length >= 3 && ringSelfIntersects(open)) {
    errors.push('El contorno se cruza a sí mismo.')
  }
  if (open.length >= 3 && ringAreaKm2(open) < 0.01) {
    errors.push('El área es demasiado pequeña para ser una zona de reparto.')
  }

  return { valid: errors.length === 0, errors }
}

export function formatArea(km2: number, locale = 'es-MX'): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: km2 < 10 ? 2 : 0 }).format(km2)} km²`
}
