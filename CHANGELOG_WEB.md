# TPIS Web Changelog

รูปแบบเวอร์ชัน: `YYYY.MM.DD-N` (วันที่ deploy + ลำดับที่ deploy ในวันนั้น)
แต่ละบรรทัดระบุ component ที่กระทบใน `[ ]`

`[WIP]` = ยังทำไม่ครบทุกกลุ่มที่วางแผนไว้ ยังไม่ deploy จริง

---

## 2026.07.18-2
  
### Fixed - badge พิกัด ในหน้า detailpage + เพิ่ม limit สำหรับ badge ที่ไม่แสดงสำหรับบาง not_verified

#### ไม่ต้องแสดง badge "📍 แสดงพิกัด" ในหน้า detailpage
- `[DetailPage]`  ลบ block นี้ออก
  ```
  {mapPt?.latitude && (<span className="coord-badge">📍 แสดงพิกัด</span>)}
  ```
#### เพิ่ม limit สำหรับ badge ที่ไม่แสดงสำหรับบาง not_verified
- `[SearchPage]`  ถ้า not_verified asset อยู่นอก 1000 อันดับแรก → ไม่ติดใน coordSet → ไม่มี badge
  วิธีแก้: เพิ่ม limit หรือเปลี่ยนเป็น query แยกเพื่อดึงแค่ id ของทุก asset ที่มีพิกัด
  แก้แค่ src/pages/SearchPage.jsx ใน fetchMapPts() บรรทัดเดียว:
  ```
  // เดิม
  .limit(1000)
  // ใหม่ — เพิ่มเป็น 3000 หรือตามจำนวน assets_map จริง
  .limit(3000)
  ```  
---

## 2026.07.18-1

### Fixed — Location: ใช้ deed fields เป็นหลักทุกหน้า + ราคาเต็มใน GIS Map

#### Schema (`0011_add_deed_fields_to_assets_map.sql`)
- `[schema]` migration `0011` — เพิ่ม `deedcity`, `deedampur`, `deedtumbol` เข้า `assets_map` view
  เหตุผล: view เดิมมีแค่ `city/ampur/tumbol` (ที่อยู่จริง) ซึ่งหลายรายการว่างเปล่า
  ทำให้ frontend ไม่สามารถ fallback ไป deed fields ได้เมื่อ query จาก assets_map

#### utils.js — เพิ่ม `fmtLocation()`
- `[utils]` เพิ่ม `fmtLocation(p)` — deed first, fallback city/ampur/tumbol
  ```js
  deedtumbol || tumbol → deedampur || ampur → deedcity || city
  ```
  ใช้ร่วมกันใน PropertyCard, LeafletMap, DetailPage, MapPage

#### PropertyCard — deed location + badge สีชมพู
- `[PropertyCard]` location บรรทัดใช้ `fmtLocation(p)` แทน manual join
- `[PropertyCard]` badge "📍 แสดงพิกัด" เปลี่ยนสีจากฟ้า → **ชมพู** (`#BE185D / #FDF2F8`)
- `[index.css]` override `.coord-badge` ทั้ง light และ dark mode เป็นสีชมพู

#### LeafletMap — tooltip deed location
- `[LeafletMap]` tooltip แสดง `fmtLocation(p)` แทน `p.city / p.ampur`
- `[LeafletMap]` ลบ "— {city}" หลังชื่อประเภท ให้ tooltip กระชับขึ้น

#### DetailPage — title + location + badge
- `[DetailPage]` title เปลี่ยนจาก `"ห้องชุด — -, -"` → `"ห้องชุด"` (ลบ city/ampur ออก)
- `[DetailPage]` location ใช้ `fmtLocation(asset)` (deed first)
- `[DetailPage]` เพิ่ม badge `📍 แสดงพิกัด` สีชมพูใน hero badges เมื่อ `mapPt?.latitude` มีค่า

#### SearchPage — deed fields ใน query
- `[SearchPage]` เพิ่ม `deedcity,deedampur,deedtumbol` ใน `assets` select query
  เพื่อให้ PropertyCard มีข้อมูลครบสำหรับ `fmtLocation()`
- `[SearchPage]` แก้ `fetchMapPts` select จาก `assetprice3` → `appraisal_price`
  (field ใน assets_map ใช้ชื่อ alias `appraisal_price` ไม่ใช่ `assetprice3`)
- `[SearchPage]` เพิ่ม `deedcity,deedampur,deedtumbol` ใน map points select

#### MapPage — deed fields + ราคาเต็ม
- `[MapPage]` เพิ่ม `deedcity,deedampur,deedtumbol` ใน assets_map select
- `[MapPage]` popup ที่อยู่ใช้ `fmtLocation(selected)` แทน `selected.ampur, selected.city`
- `[MapPage]` ราคาใน popup เปลี่ยนจาก `fmtPrice` → `fmtPriceFull` แสดงเลขเต็ม
  เช่น `506,371 ฿` แทน `506 K ฿`
- `[MapPage]` แก้ price field จาก `selected.assetprice3` → `selected.appraisal_price`

---

## 2026.07.14-2

### Fixed — Dashboard: province_summary view + DashboardPage query

- `[schema]` migration `0010_fix_province_summary_view.sql` — DROP และ recreate view ใหม่
  group by เฉพาะ `led_province_id, led_province_name` (ตัด `city` ออก)
  ต้อง drop `assets_map` และ `auction_today` ก่อนเพราะ Postgres ไม่ให้ลบ column จาก view
  แล้วสร้างคืนทั้ง 3 view พร้อม GRANT SELECT to anon
- `[DashboardPage]` แก้ query จาก `select('city, ...')` → `select('led_province_name, ...')`
- `[DashboardPage]` แก้ key และ display จาก `p.city` → `p.led_province_name`

---

## 2026.07.14-1

### Fixed — Dashboard: ทรัพย์ตามจังหวัด แสดงข้อมูลซ้ำและไม่ครบ

- `[DashboardPage]` แก้ query `province_summary` จาก `select('city, ...')` 
  → `select('led_province_name, ...')`
  สาเหตุ: view เดิม group by `city` (ที่อยู่จริงของทรัพย์) ทำให้ 1 จังหวัด
  ```
  // เดิม
  .select('city, total_assets, total_active, avg_price')
  // ใหม่
  .select('led_province_name, total_assets, total_active, avg_price')
  ```
  แตกเป็นหลาย row — กรุงเทพฯ แสดงเป็น 3 แถวแยกกันแทนที่จะรวมเป็นแถวเดียว
- `[DashboardPage]` แก้ key และ display จาก `p.city` → `p.led_province_name`
  ใน province bar chart (Top 15)
  ผลลัพธ์: กรุงเทพมหานคร แสดงเป็น 1 แถว รวม 9,062 รายการ
  และ Top 15 แสดงครบทุกจังหวัดที่มีทรัพย์จริง
  ```
  // เดิม
  <div key={p.city}>{p.city}</div>
  // ใหม่
  <div key={p.led_province_name}>{p.led_province_name}</div>
  ```  
---

## 2026.07.12-3

### Changed — Batch A: UX/UI improvements ตาม review

#### Dark Mode (`src/index.css`, `src/components/Navbar.jsx`, `index.html`)

- `[design]` เพิ่ม dark mode ครบระบบ — CSS custom properties ชุด dark ใน `:root[data-theme="dark"]`
  สี: bg `#0F172A`, surface `#1E293B`, text `#E2E8F0`, border `#2D3F55`
- `[design]` Leaflet map dark effect ผ่าน CSS filter: `brightness invert contrast hue-rotate`
- `[Navbar]` ลบ "จำนวนรายการในระบบ" ออกจาก navbar right
  เพิ่ม Dark Mode toggle button (🌙/☀) ขวาสุดของ navbar
- `[index.html]` เพิ่ม inline script init theme ก่อน CSS render — ป้องกัน flash of wrong theme
  อ่าน `localStorage['tpis-theme']` แล้ว set `data-theme` บน `<html>` ทันที
- `[Navbar]` บันทึก preference ใน `localStorage['tpis-theme']` ข้ามการ refresh

#### "รับประมูล" → "เปิดประมูล" (`src/lib/utils.js`, `src/components/SearchFilters.jsx`)

- `[utils]` `statusInfo()` แก้ label จาก `'รับประมูล'` → `'เปิดประมูล'`
  กระทบทุกหน้าที่ใช้ `statusInfo()` — SearchPage, DetailPage, MapPage
- `[SearchFilters]` แก้ label status button `'เปิดอยู่'` → `'เปิดประมูล'` ให้สอดคล้องกัน

#### Tag "📍 พิกัด" บน Property Card (`src/components/PropertyCard.jsx`, `src/pages/SearchPage.jsx`)

- `[PropertyCard]` เพิ่ม prop `hasCoord: boolean` — ถ้า true แสดง badge `📍 พิกัด` ในแถว badges
  badge สีฟ้า (เหมือน type badge ห้องชุด) ทั้ง light และ dark mode
- `[SearchPage]` สร้าง `coordSet = useMemo(() => new Set(mapPts.map(p => p.id)), [mapPts])`
  ส่ง `hasCoord={coordSet.has(p.id)}` ให้แต่ละ PropertyCard โดยไม่ต้อง fetch เพิ่ม
  (ใช้ข้อมูลจาก mapPts ที่ดึงอยู่แล้ว)

#### โฉนด: ใช้ `deedno` array แทน `deedno_raw` (`src/pages/DetailPage.jsx`)

- `[DetailPage]` เปลี่ยนแหล่งข้อมูลโฉนดใน hero section จาก `asset.deedno_raw` (string ดิบ)
  → `asset.deedno` (array จาก DB) โดย join ด้วย `', '`
  fallback: ถ้า deedno array ว่าง ใช้ deedno_raw แทน
- `[DetailPage]` เปลี่ยน font จาก `font-family: var(--mono)` → font ปกติ
  ให้เหมือนกับช่องพื้นที่และจำนวนโฉนด

#### Card Size Fix (`src/index.css`)

- `[design]` เพิ่ม `min-height: 140px` บน `.property-card`
- `[design]` ขยาย `.card-img` จาก 130px → 150px และเพิ่ม `min-height: 140px`
- `[design]` ปรับ font-size: location/area 0.85rem, deed 0.78rem, ai-summary 0.75rem
  ให้ content ใน card อ่านง่ายขึ้นและไม่ถูกตัดทิ้ง

---

## 2026.07.12-2

### Fixed — Detail Page: 5 จุดที่แก้จากการเปรียบเทียบกับต้นฉบับ LED

- `[DetailPage]` **ราคาแสดงเป็นเลขเต็ม** — เพิ่ม `fmtPriceFull()` ใน `utils.js`
  ใช้แทน `fmtPrice()` ในทุกจุดของ Detail page (ราคาประเมิน, ยอดหนี้, มัดจำ, ราคาที่ดิน)
  ผลลัพธ์: `772,000 ฿` แทน `772 K ฿`

- `[DetailPage]` **ลบปุ่ม "ดูข้อมูลต้นฉบับบน LED"** ออกจาก sidebar
  เหตุผล: ไม่จำเป็นต้องอ้างอิงกลับไป LED เพราะ TPIS มีข้อมูลครบแล้ว

- `[DetailPage]` **ลบราคาออกจากตารางนัดประมูล** — ไม่ดึง `asset_price` จาก `asset_bid_rounds`
  เหตุผล: `asset_price` ใน bid rounds คือราคาประเมินของเจ้าพนักงาน ซึ่งแสดงอยู่ใน
  panel "วิเคราะห์ราคา" แล้ว — แสดงซ้ำทำให้สับสน
  ตารางนัดประมูลแสดงเฉพาะ: เลขนัด | วันที่ | สถานะ

- `[DetailPage]` **Lightbox popup สำหรับรูปภาพ** — กดรูปแล้วขึ้น overlay แทนเปิด tab ใหม่
  - รูปหลัก (`url_picture`): คลิกที่รูปเปิด lightbox
  - รูปย่อย (`url_map`, `url_mapjot`): เปลี่ยนจาก `<a target="_blank">` → คลิก lightbox
  - กด Escape หรือคลิกนอกรูปเพื่อปิด
  - เพิ่ม component `<Lightbox>` + `<Thumb>` + CSS class `.lightbox-overlay`, `.lightbox-img`, `.img-thumb`

- `[DetailPage]` **แสดง bid rounds เฉพาะที่มีข้อมูลจริง** — filter `r.bid_date != null`
  เหตุผล: `asset_bid_rounds` อาจมี round 7, 8 ที่ LED ส่ง issale code มาแต่ไม่มีวันนัด
  หลัง filter: แสดงเฉพาะ round ที่เคยมีการนัดประมูลจริง พร้อมแสดงจำนวนนัดที่มุมขวาของ panel header

---

## 2026.07.12-1

### Changed — SearchPage: Redesign ตาม Frontend Design Specification v1

ปรับหน้าหลัก (SearchPage) ใหม่ทั้งหมดตาม Design Spec — ทั้ง UI, UX, และ layout

#### Design System (`src/index.css`)

- `[design]` Background เปลี่ยนจาก warm stone `#F5F4F0` → cool blue `#F6F8FC`
- `[design]` Border radius cards: 12px → 16px, เพิ่ม `--r-xl: 20px`
- `[design]` Shadow เปลี่ยนเป็น blue-tinted: `rgba(30,58,138,...)` แทน `rgba(0,0,0,...)`
- `[design]` เพิ่ม accent orange `#F97316` แทนที่ `#C2410C` (ใช้สำหรับ hot deal, upcoming)
- `[design]` Success color: `#10B981`, Danger: `#EF4444` ตาม spec
- `[design]` เพิ่ม `.skel` skeleton loading animation
- `[design]` เพิ่ม CSS classes ใหม่: `.hero-stat`, `.chip`, `.filter-section`, `.score-badge`, `.ai-summary`

#### Navbar (`src/components/Navbar.jsx`)

- `[Navbar]` เพิ่ม glass effect: `backdrop-filter: blur(16px) saturate(180%)` + semi-transparent bg
- `[Navbar]` เพิ่ม Global Search bar — `form` + `input` ค้นหาโฉนด/จังหวัด/เจ้าของ
- `[Navbar]` เมื่อกด Enter ใน search bar → navigate ไป `/?q=...` แล้ว SearchPage รับ query

#### HeroStats (`src/components/HeroStats.jsx`) — ใหม่

- `[HeroStats]` 4 animated KPI cards แสดงข้อมูล real-time จาก Supabase
  - ทรัพย์ทั้งหมด (`assets` count)
  - ประมูลวันนี้ (`asset_bid_rounds` where `bid_date = today AND issale_code = '0'`)
  - จังหวัดที่มีทรัพย์ (`province_summary` distinct count)
  - รับประมูลอยู่ (`assets` where `is_closed = false`)
- `[HeroStats]` Animated counter: ease-out cubic จาก 0 → target ใน 1.2 วินาที
- `[HeroStats]` แสดงเฉพาะ SearchPage บนสุดก่อน 3-panel

#### FilterChips (`src/components/FilterChips.jsx`) — ใหม่

- `[FilterChips]` Quick filter chips 6 ตัว แสดงระหว่าง HeroStats กับ 3-panel
  - 🔥 Hot Deal (ราคา < 3M), 🏠 บ้าน/อาคาร, 🌾 ที่ดิน, 🏢 ห้องชุด, 📅 เปิดประมูล, ✅ ปิดแล้ว
- `[FilterChips]` Toggle ได้ — กด chip เดิมซ้ำ = ยกเลิก filter กลับไป default
- `[FilterChips]` กด chip → set filter + trigger search ทันที ไม่ต้องกดปุ่มค้นหา

#### SearchFilters (`src/components/SearchFilters.jsx`) — Redesign

- `[SearchFilters]` เปลี่ยน layout เป็น collapsible sections แต่ละ section มี header toggle
- `[SearchFilters]` **Cascading Province → District dropdown** โดยใช้ `th_provinces` + `th_districts` (จาก migration 0009)
  - เลือกจังหวัด → fetch `th_provinces` เพื่อหา kongvut id → fetch `th_districts` ตาม `province_id`
  - District dropdown ปรากฏก็ต่อเมื่อเลือกจังหวัดแล้วเท่านั้น
  - Loading state แสดงขณะ fetch districts
- `[SearchFilters]` เพิ่ม price preset buttons: < 1M / < 3M / < 5M / < 10M (toggle ได้)
- `[SearchFilters]` District ใช้ `.eq('ampur', name_th)` แทน `.ilike()` เพราะชื่อตรงกับ `assets.ampur`

#### PropertyCard (`src/components/PropertyCard.jsx`) — Redesign

- `[PropertyCard]` เพิ่ม **Investment Score badge** (mock, deterministic จาก `id`)
  - ค่า 55–95 คำนวณจาก `(id * 2654435761) >>> 0) % 41 + 55`
  - สีตามระดับ: สีเขียว (≥78) / ส้ม (≥65) / เทา (<65)
  - แสดง star rating ★★★★★ ตามช่วงคะแนน
- `[PropertyCard]` เพิ่ม **AI Summary** (mock) 1 บรรทัดด้านล่างใต้พื้นที่
  - ข้อความต่างกันตามช่วงคะแนน: "ทำเลดี · ราคาน่าสนใจ" / "น่าพิจารณา" / "ควรประเมินความเสี่ยง"
- `[PropertyCard]` Card hover: `transform: translateY(-2px)` + shadow + border accent
- `[PropertyCard]` type badge สีใหม่: ที่ดิน=เขียว / ห้องชุด=น้ำเงิน / บ้าน=ส้ม

#### SearchPage (`src/pages/SearchPage.jsx`) — Restructure

- `[SearchPage]` Layout ใหม่: `search-page` → `search-top` (hero+chips) + `search-panels` (3-panel)
  - 3-panel: sidebar 228px | results flex-1 | map 36%
- `[SearchPage]` รองรับ **global search** จาก navbar URL param `?q=` — query `deedno_raw`, `city`, `ownername`
- `[SearchPage]` filter `ampur` เปลี่ยนจาก `.ilike()` → `.eq()` เพื่อให้ตรงกับ dropdown ที่เลือก
- `[SearchPage]` เพิ่ม `led_province_id` ใน filter state เพื่อส่งต่อให้ SearchFilters fetch districts
- `[SearchPage]` chips handler: set filter + trigger load โดยไม่รีเซ็ต filter อื่น

### Added — Schema: ข้อมูลภูมิศาสตร์ไทย

- `[schema]` migration `0009_thai_geo_tables.sql` — 3 ตารางพร้อมข้อมูลครบ
  ที่มา: [kongvut/thai-province-data](https://github.com/kongvut/thai-province-data) (MIT License)
  - `th_provinces`: 77 จังหวัด + `led_province_id` สำหรับ JOIN กับ `assets`
  - `th_districts`: 930 อำเภอ FK → th_provinces
  - `th_subdistricts`: 7,452 ตำบล FK → th_districts + zip_code
  - GIN index บน `name_th` ของ districts และ subdistricts รองรับ autocomplete ในอนาคต
  - RLS public read + GRANT SELECT to anon ครบทุกตาราง

### To-do (ยังไม่ทำ)

- `[admin]` ระบบ Login สำหรับ Admin page — Supabase Auth + protected route + `users.role = 'admin'`
- `[detail]` Lightbox popup เมื่อกดรูปภาพ (แทนการเปิด tab ใหม่)
- `[detail]` แก้ราคาแสดงเป็นเลขเต็ม + ลบ asset_price ออกจากตารางนัดประมูล
- `[search]` Subdistrict (ตำบล) dropdown ระดับที่ 3
- `[search]` Investment Score จาก AI engine จริง (ปัจจุบัน mock)
- `[search]` AI Summary จาก Claude API (ปัจจุบัน mock)

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
  Tables ที่ grant: `assets`, `asset_bid_rounds`, `asset_images`, `asset_history`,
  `parcels`, `asset_parcels`, `crawler_runs`, `crawler_run_details`, `landsmaps_sessions`
  Views ที่ grant: `assets_map`, `province_summary`, `auction_today`
  เพิ่ม `alter default privileges` กัน table ใหม่ในอนาคตพังซ้ำ

### To-do (ยังไม่ทำ)

- `[admin]` ระบบ Login สำหรับ Admin page — Supabase Auth + protected route + `users.role = 'admin'`

---

## 2026.07.11-1

### Added — Phase 2: Web Frontend (React + Vite)

สร้าง web application ครบ 5 หน้า — 21 ไฟล์ — ใช้งานได้จริงทันทีที่เชื่อมกับ Supabase

**Stack:** React 18 + Vite, React Router v6, Supabase JS, react-leaflet, Recharts
**Deploy target:** Cloudflare Pages
**Map:** Leaflet/OSM (primary) + Google Maps skeleton (รอ API key)

#### Pages
- `[SearchPage]` 3-panel layout: filter + results + Leaflet map live
- `[DetailPage]` Hero image, นัดประมูลทุกรอบ, วิเคราะห์ราคา, แผนที่ใน page
- `[MapPage]` Full-screen map, filter sidebar, popup เมื่อกด marker
- `[DashboardPage]` 4 stat cards, bar chart จังหวัด, pie chart ประเภท
- `[AdminPage]` Crawler runs, LandsMaps session, upload cookies form

#### Setup
```bash
cp .env.example .env   # ใส่ VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install && npm run dev
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
