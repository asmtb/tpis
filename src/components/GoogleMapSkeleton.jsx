/**
 * GoogleMapSkeleton.jsx
 * โครงสำหรับ Google Maps — เปิดใช้งานได้โดยตั้งค่า VITE_GOOGLE_MAPS_KEY
 * ในอนาคต: แทนที่ด้วย @react-google-maps/api หรือ google-maps-react
 */
export default function GoogleMapSkeleton({ apiKey }) {
  if (apiKey) {
    // TODO: implement Google Maps when API key is available
    // import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'
  }

  return (
    <div
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #E8E5DF 0%, #DDD9D1 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 20, textAlign: 'center',
        fontFamily: 'Sarabun, sans-serif',
      }}
    >
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
        stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <div>
        <div style={{ fontWeight: 700, color: '#57534E', marginBottom: 4 }}>Google Maps</div>
        <div style={{ fontSize: 13, color: '#A8A29E', lineHeight: 1.5 }}>
          ตั้งค่า <code style={{ background: '#E8E5DF', padding: '1px 5px', borderRadius: 3 }}>VITE_GOOGLE_MAPS_KEY</code>
          <br />ในไฟล์ <code style={{ background: '#E8E5DF', padding: '1px 5px', borderRadius: 3 }}>.env</code> เพื่อเปิดใช้งาน
        </div>
      </div>
      <div
        style={{
          fontSize: 11, color: '#B5B0A7',
          padding: '6px 12px', background: '#E8E5DF',
          borderRadius: 4, marginTop: 4,
        }}
      >
        ขณะนี้ใช้ OpenStreetMap (Leaflet) เป็นค่าเริ่มต้น
      </div>
    </div>
  )
}
