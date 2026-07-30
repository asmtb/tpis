/**
 * useGeoFilter — shared hook สำหรับ cascading dropdown จังหวัด → อำเภอ → ตำบล
 * ใช้ร่วมกันใน SearchFilters และ MapPage
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useGeoFilter(ledProvinceId, districtId) {
  const [districts,     setDistricts]     = useState([])
  const [subdistricts,  setSubdistricts]  = useState([])
  const [loadingDist,   setLoadingDist]   = useState(false)
  const [loadingSub,    setLoadingSub]    = useState(false)

  // โหลด districts เมื่อ province เปลี่ยน
  useEffect(() => {
    if (!ledProvinceId) { setDistricts([]); setSubdistricts([]); return }
    setLoadingDist(true)
    supabase
      .from('th_provinces')
      .select('id')
      .eq('led_province_id', ledProvinceId)
      .single()
      .then(({ data: prov }) => {
        if (!prov) { setLoadingDist(false); return null }
        return supabase
          .from('th_districts')
          .select('id, name_th')
          .eq('province_id', prov.id)
          .order('name_th')
      })
      .then(res => {
        if (res?.data) setDistricts(res.data)
        setLoadingDist(false)
      })
      .catch(() => setLoadingDist(false))
  }, [ledProvinceId])

  // โหลด subdistricts เมื่อ district เปลี่ยน
  useEffect(() => {
    if (!districtId) { setSubdistricts([]); return }
    setLoadingSub(true)
    supabase
      .from('th_subdistricts')
      .select('id, name_th')
      .eq('district_id', districtId)
      .order('name_th')
      .then(({ data }) => {
        setSubdistricts(data || [])
        setLoadingSub(false)
      })
      .catch(() => setLoadingSub(false))
  }, [districtId])

  return { districts, subdistricts, loadingDist, loadingSub }
}
