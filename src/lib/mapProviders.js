/**
 * mapProviders.js — Map provider abstraction (MapController pattern)
 *
 * Switch provider ด้วย ACTIVE_PROVIDER config ค่าเดียว
 * Leaflet (OSM) = primary (ฟรี)
 * Google Maps   = skeleton (ต้องตั้งค่า VITE_GOOGLE_MAPS_KEY)
 */

export const PROVIDERS = {
  leaflet: {
    id:        'leaflet',
    label:     'OSM',
    fullLabel: 'OpenStreetMap',
    free:      true,
    ready:     true,
  },
  google: {
    id:        'google',
    label:     'Google',
    fullLabel: 'Google Maps',
    free:      false,
    ready:     !!import.meta.env.VITE_GOOGLE_MAPS_KEY,
    apiKey:    import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
  },
}

/** Provider ที่ใช้งานตอนนี้ */
export const ACTIVE_PROVIDER = PROVIDERS.leaflet

/** Leaflet tile config */
export const OSM_TILE   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTR   = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** ศูนย์กลางประเทศไทย */
export const TH_CENTER = [13.038, 101.496]
export const TH_ZOOM   = 6
