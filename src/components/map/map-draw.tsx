import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AreaGeoJSON {
  type: 'Feature'
  geometry: {
    type: 'Polygon' | 'Circle'
    coordinates: number[][] | number[][][]
  }
  properties: { radius?: number }
}

/* ------------------------------------------------------------------ */
/*  Injected styles                                                    */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'coexist-draw-overrides'

function injectDrawStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .leaflet-draw-toolbar a { border-radius: 6px !important; }
    .leaflet-draw-actions a { border-radius: 4px !important; }
  `
  document.head.appendChild(style)
}

/* ------------------------------------------------------------------ */
/*  Draw overlay hook                                                  */
/* ------------------------------------------------------------------ */

interface UseMapDrawOptions {
  map: L.Map | null
  onAreaChange?: (area: AreaGeoJSON | null) => void
}

export function useMapDraw({ map, onAreaChange }: UseMapDrawOptions) {
  const onAreaChangeRef = useRef(onAreaChange)
  onAreaChangeRef.current = onAreaChange
  const controlRef = useRef<L.Control.Draw | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (!map) return
    injectDrawStyles()

    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 },
        },
        circle: {
          shapeOptions: { color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 },
        },
        rectangle: {
          shapeOptions: { color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 },
        },
        polyline: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })

    map.addControl(drawControl)
    controlRef.current = drawControl

    function emitArea() {
      const layers = drawnItems.getLayers()
      if (layers.length === 0) {
        onAreaChangeRef.current?.(null)
        return
      }

      const last = layers[layers.length - 1]
      const geoJSON = (last as L.Polygon | L.Circle).toGeoJSON() as AreaGeoJSON

      if (last instanceof L.Circle) {
        geoJSON.properties = { radius: last.getRadius() }
      }

      onAreaChangeRef.current?.(geoJSON)
    }

    map.on(L.Draw.Event.CREATED, ((e: L.DrawEvents.Created) => {
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      emitArea()
    }) as unknown as L.LeafletEventHandlerFn)

    map.on(L.Draw.Event.EDITED, () => emitArea())
    map.on(L.Draw.Event.DELETED, () => emitArea())

    return () => {
      map.off(L.Draw.Event.CREATED)
      map.off(L.Draw.Event.EDITED)
      map.off(L.Draw.Event.DELETED)
      if (controlRef.current) {
        map.removeControl(controlRef.current)
        controlRef.current = null
      }
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current)
        drawnItemsRef.current = null
      }
    }
  }, [map])
}
