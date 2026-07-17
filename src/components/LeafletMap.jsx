import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { OSM_TILE, OSM_ATTR, TH_CENTER, TH_ZOOM } from '../lib/mapProviders.js'
import { fmtPriceShort, fmtLocation, typeLabel } from '../lib/utils.js'

function FlyTo({ properties, selectedId }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId || !properties?.length) return
    const p = properties.find(x => x.id === selectedId)
    if (p?.latitude && p?.longitude) {
      map.flyTo([p.latitude, p.longitude], 14, { duration: 0.8 })
    }
  }, [selectedId, properties, map])
  return null
}

function markerColor(p) {
  if (p.is_sold)   return '#B91C1C'
  if (p.is_closed) return '#A8A29E'
  return '#1A3A5C'
}

export default function LeafletMap({ properties = [], selectedId, onMarkerClick }) {
  const pts = useMemo(
    () => properties.filter(p => p.latitude && p.longitude),
    [properties]
  )

  return (
    <MapContainer
      center={TH_CENTER}
      zoom={TH_ZOOM}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer url={OSM_TILE} attribution={OSM_ATTR} maxZoom={19} />
      <FlyTo properties={pts} selectedId={selectedId} />

      {pts.map(p => (
        <CircleMarker
          key={p.id}
          center={[p.latitude, p.longitude]}
          radius={selectedId === p.id ? 10 : 7}
          pathOptions={{
            fillColor:   markerColor(p),
            color:       selectedId === p.id ? '#fff' : 'rgba(255,255,255,0.7)',
            weight:      selectedId === p.id ? 2.5 : 1.5,
            opacity:     1,
            fillOpacity: 0.88,
          }}
          eventHandlers={{ click: () => onMarkerClick?.(p) }}
        >
          <Tooltip sticky>
            <div style={{
              fontFamily: 'Sarabun, sans-serif',
              fontSize: 12, lineHeight: 1.6, minWidth: 130,
            }}>
              <strong style={{ display: 'block', marginBottom: 1 }}>
                {typeLabel(p.asset_type_id)}
              </strong>
              <span style={{ color: '#6B6560' }}>
                {fmtLocation(p) || '—'}
              </span>
              <br/>
              <span style={{ color: '#1A3A5C', fontWeight: 700 }}>
                {fmtPriceShort(p.appraisal_price)}
              </span>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
