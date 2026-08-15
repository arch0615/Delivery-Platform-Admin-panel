import type { FeatureCollection } from 'geojson'
import {
  Map as MapLibreMap,
  NavigationControl,
  prewarm,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  type MapOptions,
} from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'

import { closeRing, type Position, type Ring } from '@/lib/geo'

import 'maplibre-gl/dist/maplibre-gl.css'

/*
 * Map surface for the zone editor.
 *
 * MapLibre is wrapped rather than used directly by the editor so the tile
 * provider stays swappable - per web architecture.txt §11.3 the map vendor
 * sits behind an adapter because tile and geocoding requests are billed per
 * call and become a material cost at volume.
 *
 * Tiles come from OpenStreetMap, which is fine for development but not for
 * production traffic under their tile usage policy. Set VITE_MAP_TILE_URL to
 * point at a real provider. A background layer is painted underneath so the
 * editor still works when tiles fail to load.
 */

/*
 * Keep MapLibre's shared worker pool alive across map teardown.
 *
 * The editor is a modal: the map is created and destroyed every time it opens,
 * and StrictMode doubles that in development. Without prewarm, each cycle
 * disposes and recreates the worker pool, which is the expensive part of
 * standing a map up.
 *
 * NOTE: GeoJSON sources are parsed on a worker, so they cannot be verified in
 * headless Chromium - see the caveat in scripts/smoke.mjs.
 */
prewarm()

const TILE_URL =
  import.meta.env['VITE_MAP_TILE_URL'] ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// NonNullable: the option is optional on MapOptions, and under
// exactOptionalPropertyTypes a `| undefined` type cannot be assigned back to it.
const STYLE: NonNullable<MapOptions['style']> = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [TILE_URL],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#dfe3e8' } },
    { id: 'basemap', type: 'raster', source: 'basemap' },
  ],
}

export type ContextZone = {
  id: string
  name: string
  boundary: Ring
  isActive: boolean
}

export type ZoneMapProps = {
  /** Ring being edited. Open - no duplicated closing point. */
  points: Ring
  /** Other zones in the same market, drawn for context. */
  otherZones: ContextZone[]
  center: Position
  onAddPoint: (point: Position) => void
  onMovePoint: (index: number, point: Position) => void
  onRemovePoint: (index: number) => void
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * Structural check rather than `instanceof GeoJSONSource`.
 *
 * The bundler can end up with a different class identity than the one the map
 * instantiated internally, and `instanceof` then fails silently - the guard
 * returns early, setData never runs, and the layer simply never draws with no
 * error anywhere.
 */
function asGeoJSONSource(source: unknown): GeoJSONSource | null {
  return source !== null &&
    typeof source === 'object' &&
    typeof (source as GeoJSONSource).setData === 'function'
    ? (source as GeoJSONSource)
    : null
}

export function ZoneMap({
  points,
  otherZones,
  center,
  onAddPoint,
  onMovePoint,
  onRemovePoint,
}: ZoneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)

  // Handlers change on every render; holding them in a ref means the map is
  // constructed once instead of being torn down and rebuilt mid-edit.
  const handlers = useRef({ onAddPoint, onMovePoint, onRemovePoint })
  useEffect(() => {
    handlers.current = { onAddPoint, onMovePoint, onRemovePoint }
  }, [onAddPoint, onMovePoint, onRemovePoint])

  // The initial centre is captured once: re-centring on every render would
  // fight the user's pan and zoom.
  const initialCenter = useRef(center)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE,
      center: initialCenter.current,
      zoom: 11,
      attributionControl: { compact: true },
    })

    mapRef.current = map
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource('other-zones', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'other-zones-fill',
        type: 'fill',
        source: 'other-zones',
        paint: {
          'fill-color': ['case', ['get', 'isActive'], '#0f766e', '#64748b'],
          'fill-opacity': 0.12,
        },
      })
      map.addLayer({
        id: 'other-zones-line',
        type: 'line',
        source: 'other-zones',
        paint: {
          'line-color': ['case', ['get', 'isActive'], '#0f766e', '#64748b'],
          'line-width': 1.5,
          'line-dasharray': [2, 2],
        },
      })

      map.addSource('draft', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'draft-fill',
        type: 'fill',
        source: 'draft',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.22 },
      })
      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        paint: { 'line-color': '#2563eb', 'line-width': 2 },
      })

      map.addSource('vertices', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'vertices',
        type: 'circle',
        source: 'vertices',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#2563eb',
          'circle-stroke-width': 2,
        },
      })

      setReady(true)
    })

    // Test hook: a WebGL canvas is opaque to Playwright, so end-to-end checks
    // need a way to assert on layer and source state. Dev builds only.
    if (import.meta.env.DEV) {
      ;(window as unknown as { __zoneMap?: MapLibreMap }).__zoneMap = map
    }

    // --- interaction ----------------------------------------------------
    let draggingIndex: number | null = null

    map.on('click', (event: MapMouseEvent) => {
      if (draggingIndex !== null) {
        return
      }

      // Ignore clicks that land on an existing vertex: those begin a drag or
      // a removal, and stacking a new point on one is never intended.
      //
      // The layer only exists after 'load'. Clicks can arrive before that, and
      // querying a missing layer throws rather than returning nothing.
      if (map.getLayer('vertices')) {
        const hits = map.queryRenderedFeatures(event.point, { layers: ['vertices'] })
        if (hits.length > 0) {
          return
        }
      }

      handlers.current.onAddPoint([event.lngLat.lng, event.lngLat.lat])
    })

    map.on('mousedown', 'vertices', (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature) {
        return
      }

      // Stop the map from panning while a vertex is being dragged.
      event.preventDefault()
      draggingIndex = Number(feature.properties?.['index'] ?? -1)
      map.getCanvas().style.cursor = 'grabbing'
    })

    map.on('mousemove', (event: MapMouseEvent) => {
      if (draggingIndex === null || draggingIndex < 0) {
        return
      }
      handlers.current.onMovePoint(draggingIndex, [event.lngLat.lng, event.lngLat.lat])
    })

    map.on('mouseup', () => {
      draggingIndex = null
      map.getCanvas().style.cursor = ''
    })

    map.on('mouseenter', 'vertices', () => {
      map.getCanvas().style.cursor = 'grab'
    })
    map.on('mouseleave', 'vertices', () => {
      if (draggingIndex === null) {
        map.getCanvas().style.cursor = ''
      }
    })

    map.on('dblclick', 'vertices', (event: MapLayerMouseEvent) => {
      // Suppress the map's double-click zoom so removing a point does not
      // also change the view.
      event.preventDefault()
      const feature = event.features?.[0]
      if (feature) {
        handlers.current.onRemovePoint(Number(feature.properties?.['index'] ?? -1))
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  // Draft ring and its vertices.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) {
      return
    }

    const draft = asGeoJSONSource(map.getSource('draft'))
    const vertices = asGeoJSONSource(map.getSource('vertices'))
    if (!draft || !vertices) {
      return
    }

    // Under three points there is no polygon yet, so show the open path.
    draft.setData(
      points.length >= 3
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Polygon', coordinates: [closeRing(points)] },
              },
            ],
          }
        : points.length === 2
          ? {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: points },
                },
              ],
            }
          : EMPTY,
    )

    vertices.setData({
      type: 'FeatureCollection',
      features: points.map((point, index) => ({
        type: 'Feature',
        properties: { index },
        geometry: { type: 'Point', coordinates: point },
      })),
    })
  }, [points, ready])

  // Surrounding zones, for context.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) {
      return
    }

    const source = asGeoJSONSource(map.getSource('other-zones'))
    if (!source) {
      return
    }

    source.setData({
      type: 'FeatureCollection',
      features: otherZones.map((zone) => ({
        type: 'Feature',
        properties: { name: zone.name, isActive: zone.isActive },
        geometry: { type: 'Polygon', coordinates: [closeRing(zone.boundary)] },
      })),
    })
  }, [otherZones, ready])

  return <div ref={containerRef} className="size-full" data-testid="zone-map" />
}
