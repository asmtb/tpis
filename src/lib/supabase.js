import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL  || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!URL || !KEY) {
  console.warn('[TPIS] Missing Supabase env vars — check .env file')
}

export const supabase = createClient(URL, KEY)
