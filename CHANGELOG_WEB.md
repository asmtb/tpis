# TPIS Web Changelog

รูปแบบเวอร์ชัน: `YYYY.MM.DD-N` (วันที่ deploy + ลำดับที่ deploy ในวันนั้น)
แต่ละบรรทัดระบุ component ที่กระทบใน `[ ]`

`[WIP]` = ยังทำไม่ครบทุกกลุ่มที่วางแผนไว้ ยังไม่ deploy จริง

---

## 2026.07.11-2

### Fixed — Build: syntax error ใน `fmtPrice()`

- `[src/lib/utils.js]` ลบ comma เกินออกจาก template literal บรรทัดที่ 7
  สาเหตุ: `${(val / 1_000).toFixed(0),}` มี `,` หลัง expression ทำให้ Rollup parse ไม่ผ่าน
  → Cloudflare Pages build failed ทันที แก้เป็น `${(val / 1_000).toFixed(0)}`

### Fixed — Runtime: `permission denied for table assets`

- `[schema]` migration `0008_grant_anon_select.sql` — GRANT SELECT ให้ `anon` role
  สาเหตุ: TPIS Web ใช้ `VITE_SUPABASE_ANON_KEY` (public key) แต่ขาด table-level GRANT
  RLS policy "public read" มีอยู่แล้วแต่ยังไม่พอ — PostgreSQL ตรวจ GRANT ก่อน RLS เสมอ
  อ้างอิง: เหมือน migration 0002 ที่แก้ปัญหาเดียวกันสำหรับ `service_role`
  Tables ที่ grant: `assets`, `asset_bid_rounds`, `asset_images`, `asset_history`,
  `parcels`, `asset_parcels`, `crawler_runs`, `crawler_run_details`, `landsmaps_sessions`
  Views ที่ grant: `assets_map`, `province_summary`, `auction_today`
  เพิ่ม `alter default privileges` กัน table ใหม่ในอนาคตพังซ้ำ

### To-do (ยังไม่ทำ)

- `[admin]` ระบบ Login สำหรับ Admin page — ปัจจุบัน Admin page เปิดสาธารณะ
  แผน: Supabase Auth + protected route + ตรวจ `users.role = 'admin'` ก่อน render

---

## 2026.07.11-1

### Added — Phase 2: Web Frontend (React + Vite)

สร้าง web application ครบ 5 หน้า — 21 ไฟล์ — ใช้งานได้จริงทันทีที่เชื่อมกับ Supabase

**Stack:** React 18 + Vite, React Router v6, Supabase JS, react-leaflet, Recharts
**Deploy target:** Cloudflare Pages
**Map:** Leaflet/OSM (primary, ฟรี) + Google Maps skeleton (รอ API key)

#### Design System (`src/index.css`)
- `[design]` CSS custom properties ทั้งระบบ — palette อิง warm stone (`#F5F4F0`) + deep navy (`#1A3A5C`) + auction orange (`#C2410C`)
- `[design]` Font: Sarabun (Thai + Latin) + IBM Plex Mono (data/codes)
- `[design]` Component classes ทั้งหมดนิยามในไฟล์เดียว: navbar, cards, filters, badges, panels, charts, admin table

#### Pages

- `[SearchPage]` หน้าหลัก 3-panel layout: filter sidebar (228px) + results grid + Leaflet map (400px) live พร้อมกัน
  - Filter: จังหวัด (77 จังหวัด), อำเภอ, ประเภท, ราคา (พร้อม preset < 1M/3M/5M), สถานะ
  - Sort: ล่าสุด / ราคาต่ำสุด / ราคาสูงสุด / วันที่ใหม่สุด
  - Pagination แบบ smart (แสดง `…` เมื่อหน้าเยอะ)
  - Map points ดึงแยกจาก results ผ่าน `assets_map` view (limit 800 จุด)
  - Toggle provider OSM / Google Maps ผ่านปุ่มบนแผนที่

- `[DetailPage]` หน้ารายละเอียดทรัพย์ (`/property/:id`) — 2-column layout
  - Hero: รูปภาพ + รูปแผนที่/โฉนด, badges ประเภท+สถานะ+วิธีขาย
  - ข้อมูลทรัพย์: เลขคดี, ศาล, คู่ความ, เจ้าของ, ผู้ครอบครอง
  - นัดประมูล: แสดงครบทุก round (1-8) พร้อมสถานะแต่ละนัด
  - วิเคราะห์ราคา: ราคาประเมิน vs ราคาประมูล + discount bar + ราคาที่ดินกรมที่ดิน
  - แผนที่ Leaflet ติดอยู่ในหน้า (ดึงพิกัดจาก `assets_map` view)
  - ลิงก์ดูต้นฉบับบน LED

- `[MapPage]` Full-screen map (`/map`) — filter sidebar ซ้าย + แผนที่เต็มขวา
  - โหลด map points ตาม filter (limit 2,000 จุด)
  - กด marker → popup แสดงรูป, ราคา, ประเภท + ปุ่มไปหน้า detail
  - Legend: สี navy = รับประมูล, เทา = ปิด, แดง = ขายแล้ว

- `[DashboardPage]` Dashboard (`/dashboard`)
  - 4 stat cards: ทรัพย์ทั้งหมด, รับประมูลอยู่, ขายแล้ว, มีพิกัด GPS
  - Bar chart จังหวัด Top 15 (custom bars ไม่ใช้ Recharts เพื่อ performance)
  - Pie chart (Recharts) สัดส่วนประเภททรัพย์ พร้อม legend + %
  - ตาราง Crawler Runs 5 รอบล่าสุด (ดึงจาก `crawler_runs` table)

- `[AdminPage]` Admin Panel (`/admin`)
  - สถิติ: ทรัพย์ทั้งหมด, มีพิกัด, รอดึงพิกัด (พร้อมเตือนถ้า pending > 0)
  - LED Crawler status: สถานะ run ล่าสุด, จำนวน records, จำนวนจังหวัด
  - LandsMaps session: แสดง active/inactive, upload cookies form (JSON input + note)
  - Crawler runs table: 15 รอบล่าสุด พร้อม mode, status, duration, version
  - Upload cookies เขียนเข้า `landsmaps_sessions` table โดยตรงผ่าน Supabase JS

#### Components

- `[Navbar]` Fixed top bar — logo + nav links + จำนวนทรัพย์ทั้งหมด (real-time จาก Supabase)
- `[PropertyCard]` Card ในหน้าค้นหา — รูป, location, deed number, พื้นที่, ราคา, discount badge (สีตามระดับ: 10%/20%/30%+)
- `[SearchFilters]` Filter panel — province dropdown (77 จังหวัด), text input อำเภอ, radio ประเภท, price range + presets, status toggle
- `[LeafletMap]` react-leaflet wrapper — CircleMarker สีตามสถานะ, Tooltip hover, FlyTo เมื่อ selectedId เปลี่ยน
- `[GoogleMapSkeleton]` Placeholder รอ `VITE_GOOGLE_MAPS_KEY`

#### Lib

- `[src/lib/supabase.js]` Supabase client จาก `VITE_SUPABASE_ANON_KEY` (public key)
- `[src/lib/constants.js]` 77 จังหวัด, asset types, issale status codes
- `[src/lib/utils.js]` Format helpers: `fmtPrice`, `fmtArea`, `fmtDate`, `fmtRelative`, `statusInfo`, `calcDiscount` ฯลฯ
- `[src/lib/mapProviders.js]` Provider abstraction — Leaflet (active) / Google Maps (skeleton)

#### Setup

```bash
cp .env.example .env   # ใส่ VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev            # localhost:5173
npm run build          # → dist/ สำหรับ Cloudflare Pages
```

---

## Template สำหรับรอบถัดไป

```markdown
## YYYY.MM.DD-N

### Added
- `[component]` ...

### Fixed
- `[component]` ...

### Changed
- `[component]` ...
```
