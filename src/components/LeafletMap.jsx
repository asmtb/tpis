import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { OSM_TILE, OSM_ATTR, TH_CENTER, TH_ZOOM } from '../lib/mapProviders.js'
import { fmtPriceShort, typeLabel } from '../lib/utils.js'

/** ย้าย view ไปหา selectedId */
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

/** สีของ marker ตามสถานะ */
function markerColor(p) {
  if (p.is_sold)   return '#B91C1C'  // ขายแล้ว
  if (p.is_closed) return '#A8A29E'  // ปิดแล้ว
  return '#1A3A5C'                    // เปิดประมูล
}

export default function LeafletMap({ properties = [], selectedId, onMarkerClick }) {
  // filter เฉพาะที่มีพิกัด
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
          eventHandlers={{
            click: () => onMarkerClick?.(p),
          }}
        >
          <Tooltip sticky>
            <div style={{ fontFamily: 'Sarabun, sans-serif', fontSize: 12, lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>
                {typeLabel(p.asset_type_id)} — {p.city}
              </strong>
              {p.ampur && <span style={{ color: '#6B6560' }}>{p.ampur}</span>}
              <br />
              <span style={{ color: '#1A3A5C', fontWeight: 700 }}>
                {fmtPriceShort(p.assetprice3)}
              </span>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
