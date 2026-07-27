import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { OSM_TILE, OSM_ATTR, TH_CENTER, TH_ZOOM } from '../lib/mapProviders.js'
import { fmtLocation, typeLabel } from '../lib/utils.js'

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

const DAY_MS = 86400000

function pinInfo(p) {
  if (p.is_sold)   return { type: 'circle', color: '#B91C1C', isNew: false }
  if (p.is_closed) return { type: 'circle', color: '#A8A29E', isNew: false }
  if (!p.latest_round_no) {
    const days = p.ischeck_date
      ? (Date.now() - new Date(p.ischeck_date).getTime()) / DAY_MS
      : 999
    if (days <= 7) return { type: 'div', color: '#6EE7B7', isNew: true }
    return           { type: 'div', color: '#10B981', isNew: false }
  }
  return             { type: 'circle', color: '#1A3A5C', isNew: false }
}

function makeDivIcon(color, isNew, isSelected) {
  const size = isSelected ? 22 : 16
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${isNew ? (isSelected ? 9 : 7) : 0}px;font-weight:900;color:#fff;font-family:sans-serif;">${isNew ? 'N' : ''}</div>`
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

export default function LeafletMap({ properties = [], selectedId, onMarkerClick }) {
  const pts = useMemo(() => properties.filter(p => p.latitude && p.longitude), [properties])

  return (
    <>
      <style>{`@keyframes pin-pulse{0%,100%{box-shadow:0 0 0 0 rgba(110,231,183,0.7),0 1px 4px rgba(0,0,0,0.35)}50%{box-shadow:0 0 0 6px rgba(110,231,183,0),0 1px 4px rgba(0,0,0,0.35)}}`}</style>
      <MapContainer center={TH_CENTER} zoom={TH_ZOOM} style={{ width:'100%', height:'100%' }} scrollWheelZoom>
        <TileLayer url={OSM_TILE} attribution={OSM_ATTR} maxZoom={19} />
        <FlyTo properties={pts} selectedId={selectedId} />
        {pts.map(p => {
          const { type, color, isNew } = pinInfo(p)
          const isSel = selectedId === p.id
          const tooltip = (
            <Tooltip sticky>
              <div style={{ fontFamily:'Sarabun,sans-serif', fontSize:12, lineHeight:1.6, minWidth:130 }}>
                <strong style={{ display:'block', marginBottom:1 }}>
                  {typeLabel(p.asset_type_id)}
                  {isNew && <span style={{ marginLeft:5, background:'#6EE7B7', color:'#065F46', fontSize:10, padding:'1px 5px', borderRadius:3, fontWeight:700 }}>NEW</span>}
                </strong>
                <span style={{ color:'#6B6560' }}>{fmtLocation(p) || '—'}</span>
              </div>
            </Tooltip>
          )
          if (type === 'div') {
            return (
              <Marker key={p.id} position={[p.latitude, p.longitude]}
                icon={makeDivIcon(color, isNew, isSel)}
                eventHandlers={{ click: () => onMarkerClick?.(p) }}>
                {tooltip}
              </Marker>
            )
          }
          return (
            <CircleMarker key={p.id} center={[p.latitude, p.longitude]}
              radius={isSel ? 10 : 7}
              pathOptions={{ fillColor:color, fillOpacity:0.88, color:isSel?'#fff':'rgba(255,255,255,0.7)', weight:isSel?2.5:1.5, opacity:1 }}
              eventHandlers={{ click: () => onMarkerClick?.(p) }}>
              {tooltip}
            </CircleMarker>
          )
        })}
      </MapContainer>
    </>
  )
}
