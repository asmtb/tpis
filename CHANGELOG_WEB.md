# TPIS Web Changelog

รูปแบบเวอร์ชัน: `YYYY.MM.DD-N` (วันที่ deploy + ลำดับที่ deploy ในวันนั้น)
แต่ละบรรทัดระบุ component ที่กระทบใน `[ ]`

`[WIP]` = ยังทำไม่ครบทุกกลุ่มที่วางแผนไว้ ยังไม่ deploy จริง

---
 
## 2026.08.13-3
 
### Changed — DetailPage: วิเคราะห์ราคา แสดงครบ 4 ราคาประเมิน + ราคาเริ่มประมูล
 
**บริบท:** LED เก็บราคาประเมินไว้หลายแหล่ง (`assetprice2–5`) แต่หน้า Detail เดิมแสดง
แค่ `assetprice3` (เจ้าพนักงานบังคับคดี) เป็นหลัก ทำให้พลาดราคาที่ใช้จริงในการเปิดประมูล
เมื่อคณะกรรมการกำหนดราคาไว้ (`assetprice5`)
 
ยืนยัน field ความหมายจากการเทียบตัวอย่างจริงในเว็บ LED กับข้อมูลใน DB:
 
| Field | ความหมาย |
|---|---|
| `assetprice2` | ราคาประเมินของผู้เชี่ยวชาญการประเมินราคา (สันนิษฐาน — ยังไม่เคยพบมีค่าใน DB) |
| `assetprice3` | ราคาประเมินของเจ้าพนักงานบังคับคดี |
| `assetprice4` | ราคาประเมินของเจ้าพนักงานประเมินราคาทรัพย์กรมบังคับคดี |
| `assetprice5` | ราคาที่กำหนดโดยคณะกรรมการกำหนดราคาทรัพย์ |
 
#### DetailPage.jsx
 
- `[DetailPage]` เพิ่ม logic คำนวณ **ราคาเริ่มประมูล** ตาม priority
  `assetprice5 > assetprice4 > assetprice3 > assetprice2`
  (ค่าแรกที่มีข้อมูล > 0 ถูกใช้เป็นราคาเริ่มประมูล พร้อม label บอกแหล่งที่มา)
  ยืนยัน logic ถูกต้องจากตัวอย่างจริง: รายการที่มี `assetprice5` มักมีค่าเท่ากับ
  `assetprice4` เสมอ (คณะกรรมการใช้ราคาตามที่เจ้าพนักงานประเมินเสนอ)
- `[DetailPage]` panel "วิเคราะห์ราคา" แสดง **ราคาเริ่มประมูล** เป็นแถวแรกสุด
  highlight ขนาดใหญ่กว่าแถวอื่น (`font-size: 1.1rem`) พร้อมวงเล็บบอกแหล่งที่มา
  เช่น "(คณะกรรมการ)" / "(เจ้าพนักงานบังคับคดี)"
- `[DetailPage]` แสดงราคาย่อยทั้งหมดที่มีข้อมูลจริง (`> 0`) เรียงลำดับ:
  1. ราคาที่กำหนดโดยคณะกรรมการ (`assetprice5`)
  2. ราคาประเมิน เจ้าพนักงานประเมินราคาทรัพย์ (`assetprice4`)
  3. ราคาประเมิน เจ้าพนักงานบังคับคดี (`assetprice3`)
  4. ราคาประเมินผู้เชี่ยวชาญ (`assetprice2`)
  5. ราคาที่ดินกรมที่ดิน (เดิมมีอยู่แล้ว จาก LandsMaps)
  ราคาที่ไม่มีข้อมูล (`null`/`0`) จะไม่แสดงแถวนั้นเลย ป้องกัน panel รกโดยไม่จำเป็น
- `[DetailPage]` ลบ logic เดิมที่เทียบ `assetprice1` (ไม่มีอยู่จริงใน schema)
  แก้เป็น `assetprice2` ตามที่สันนิษฐานไว้

---
 
## 2026.08.13-2
 
### Added — issale_code mapping ครบทุก value
 
**สาเหตุ:** query `asset_bid_rounds` พบ issale_code หลาย value ที่แสดงว่า `ไม่ทราบ(X)`
ทำการสืบค้นความหมายจากเว็บ LED + ตรวจสอบจากตัวอย่าง asset_id จริงใน DB
 
#### `tpis-backend/led_parser.py`
 
- `[led_parser]` เพิ่ม `ISSALE_STATUS` mapping ครบ 20 value
  ก่อนหน้ามีแค่ 5 value (`0,1,3,13,25`) ที่เหลือแสดงว่า `ไม่ทราบ(X)`
#### `tpis/src/lib/constants.js`
 
- `[constants]` เพิ่ม `ISSALE_STATUS` mapping ครบ 20 value
  frontend จะแสดงความหมายแทน `ไม่ทราบ(X)` ในหน้า Detail → นัดประมูล
#### Mapping ทั้งหมด
 
| Code | ความหมาย | จำนวนใน DB |
|---|---|---|
| `0` | รอประมูล | 49,169 |
| `1` | ขายได้ | 7,442 |
| `2` | โจทก์จำเลยค้าน (มีผู้ผูกพันราคา) | 5 |
| `3` | งดขาย (ไม่มีผู้สู้ราคา) | 8,901 |
| `4` | งดขาย (ส่งประกาศมิชอบ) | 23 |
| `6` | ถอนการยึดทรัพย์ | 4,314 |
| `7` | งดขาย (โจทก์แถลง) | 251 |
| `8` | งดขาย (โดยเจ้าพนักงาน) | 602 |
| `9` | งดขาย (ขาดคำสั่งศาล) | 2 |
| `10` | งดขาย | 5,350 |
| `12` | งดขาย (ป.วิ.แพ่ง มาตรา 309) | 143 |
| `13` | งดขาย | 4,403 |
| `14` | งดขาย | 50 |
| `15` | งดขาย | 35 |
| `16` | งดขาย | 209 |
| `22` | งดขาย | 4 |
| `23` | งดขาย | 429 |
| `25` | งดขาย | 126 |
| `26` | งดขายในนัดที่เหลือ | 714 |
| `27` | งดขายตามคำสั่งศาล | 12 |

---

## [WIP] 2026.08.12-1

### Added — ระบบ Login (Supabase Auth, email + password)

- `[AuthContext.jsx]` (ไฟล์ใหม่, `src/lib/`) — เก็บ auth session + role ของผู้ใช้ผ่าน
  React Context เดียวทั้งแอป
  - โหลด session ปัจจุบันตอนเปิดแอป (`supabase.auth.getSession()`) และ subscribe
    `onAuthStateChange` ให้ state sync กับ login/logout แบบ realtime
  - หลังได้ user แล้ว query role จากตาราง `public.users` (join ผ่าน `id` — ตารางนี้
    สร้างอัตโนมัติโดย trigger `handle_new_user()` ที่มีอยู่แล้วใน schema baseline)
  - export `useAuth()` hook คืน `{ user, role, loading, isAdmin, signIn, signOut }`
  - หมายเหตุในโค้ด: role ที่ context เก็บไว้ใช้คุมแค่ UI (ซ่อน/แสดงปุ่ม, redirect)
    ไม่ใช่ชั้นความปลอดภัยจริง — ความปลอดภัยจริงอยู่ที่ RLS policy ฝั่ง Supabase
    (`current_user_role() = 'admin'`) ที่มีอยู่แล้วในตาราง `parcels` เป็นต้น
- `[RequireAdmin.jsx]` (ไฟล์ใหม่, `src/components/`) — route guard สำหรับหน้าที่ต้อง
  สิทธิ์ admin
  - ยังไม่ login → เด้งไป `/signin` พร้อมจำหน้าที่ตั้งใจจะมาไว้ใน
    `location.state.from` เพื่อเด้งกลับอัตโนมัติหลัง login สำเร็จ
  - login แล้วแต่ role ไม่ใช่ `admin` → โชว่ alert แจ้งเตือนแทนหน้าเปล่าๆ พร้อม role
    ปัจจุบันที่มี
  - loading state ระหว่างเช็ค session ครั้งแรก — ใช้ `.state-box`/`.dots` component
    เดียวกับที่หน้า Admin เดิมใช้อยู่แล้ว
- `[SignInPage.jsx]` (ไฟล์ใหม่, `src/pages/`) — ฟอร์ม email + password
  - login แล้ว (เช่นเปิดแท็บใหม่ หรือ refresh หน้า `/signin` ตรงๆ) → เด้งไปหน้าที่ตั้งใจ
    จะมา (`from`) อัตโนมัติแทนที่จะค้างอยู่หน้า login
  - error message แปลเป็นไทยเฉพาะเคส "Invalid login credentials" (พบบ่อยสุด) ส่วน
    error อื่นแสดง message ดิบจาก Supabase
  - ไม่มีหน้า sign-up สาธารณะโดยตั้งใจ — ต้องสร้าง user ผ่าน Supabase Dashboard เอง
    (Authentication → Users → Add user) แล้วรัน SQL ตั้ง `role='admin'` ในตาราง
    `public.users` เพราะมี admin แค่คนเดียว ไม่จำเป็นต้องเปิด sign-up flow

### Changed — App.jsx, Navbar.jsx

- `[App.jsx]` ห่อทั้งแอปด้วย `<AuthProvider>`, เพิ่ม route `/signin`, ครอบ route
  `/admin` เดิมด้วย `<RequireAdmin>` — หน้า public อื่น (`/`, `/map`, `/dashboard`,
  `/property/:id`) ไม่ถูกกระทบ เข้าได้ปกติโดยไม่ต้อง login
- `[Navbar.jsx]` เพิ่ม auth widget ท้าย nav bar (ก่อนปุ่ม dark mode toggle):
  - ยังไม่ login → ปุ่ม "เข้าสู่ระบบ" ลิงก์ไป `/signin`
  - login แล้ว → โชว์ email ผู้ใช้ (มี badge 👤 ถ้า role เป็น admin) + ปุ่ม
    "ออกจากระบบ" — กดแล้วเรียก `signOut()` แล้ว navigate กลับหน้าแรก

### Changed — index.css

- `[index.css]` เพิ่ม `.navbar-auth` / `.navbar-auth-email` / `.navbar-auth-btn` —
  style ของ auth widget ใน navbar (สีขาวโปร่งแสงให้เข้ากับพื้นหลัง navbar สีน้ำเงินเดิม)
- `[index.css]` เพิ่ม `.signin-wrap` / `.signin-card` / `.signin-logo` /
  `.signin-title` / `.signin-sub` / `.signin-label` / `.signin-input` /
  `.signin-submit` — style หน้า sign-in ทั้งหน้า (card กลางจอ, logo TPIS ด้านบน,
  ใช้ `.abtn.primary` เดิมสำหรับปุ่ม submit ไม่สร้างปุ่มใหม่ซ้ำ)

### Discovered — ต้องทำ manual setup ก่อนใช้งานได้จริง

- Supabase Auth ไม่มี UI สำหรับสร้าง admin user คนแรกจากฝั่ง frontend (ตั้งใจไม่เปิด
  sign-up สาธารณะ) ต้องสร้างผ่าน Supabase Dashboard เอง 2 ขั้นตอน:
  1. Authentication → Users → Add user (เลือก "Auto Confirm User" ไม่งั้นต้องไป
     ยืนยันในอีเมลก่อนถึงจะ login ได้)
  2. SQL Editor: `update public.users set role = 'admin' where email = '<email>';`

### Planned — Google OAuth (ถามไว้ ยังไม่ทำ)

- ถามเรื่อง Google login ไว้ — สรุปว่าทำได้จริงผ่าน Supabase Auth Google provider
  แต่ต้องตั้งค่านอกโค้ด (OAuth Client ใน Google Cloud Console + ใส่ Client
  ID/Secret ใน Supabase Dashboard → Authentication → Providers → Google + เพิ่ม
  redirect URI ที่ Supabase ให้กลับไปใส่ใน Google Console) — ยังไม่ implement
  เพราะตัดสินใจใช้ email+password พอสำหรับ admin คนเดียว ถ้าต้องการทีหลังแค่เพิ่ม
  ปุ่มเรียก `supabase.auth.signInWithOAuth({ provider: 'google' })` ในหน้า
  `SignInPage.jsx` ไม่ต้องแก้โครงสร้าง auth ใหม่

### Planned — หน้า "จัดการโฉนด" (ต่อจากนี้)

- แผนที่คุยกันไว้ก่อนเริ่มงานเรื่อง auth: เพิ่มหน้า `/admin` ให้มี tab ย่อย
  Dashboard / Crawler (หน้า Admin เดิม) / จัดการโฉนด
- หน้าจัดการโฉนด: ตาราง `parcels` join `asset_parcels`→`assets`, filter
  จังหวัด/verify_status/มี-ไม่มี tag/ค้นหาเลขโฉนด-เลขที่ทรัพย์/ช่วงวันที่ (จาก
  `assets.created_at`), แก้ไข lat/long + คอลัมน์ `tag` (ชื่อคอนโด/สถานที่) แบบ
  inline ต่อแถว, ปุ่ม Export JSON เฉพาะรายการที่ตรง filter, pagination 50/หน้า
- ต้องมี migration ใหม่ก่อนเริ่มเขียนหน้านี้: เพิ่มคอลัมน์ `parcels.tag`, เพิ่มค่า
  `'manual'` ใน `verify_status` enum และแก้ `is_retryable()` ให้ข้าม status นี้
  กัน `landsmaps_collector` รันทับพิกัดที่แอดมินกรอกเอง — รอ auth ใช้งานได้จริงก่อน
  ถึงจะเริ่มเขียนหน้านี้ (RLS ต้องมี session role=admin ถึงจะ update ได้จริง)

---

## 2026.08.11-2

### Changed — SearchPage: Layout ใหม่ + View Modes + Responsive

#### SearchPage.jsx
- `[SearchPage]` เปลี่ยน layout จาก 3-panel (sidebar + results + map) เป็น full-width
  centered `max-width: 1400px` ไม่เต็มจอ มี margin ซ้ายขวาเหมือน Dashboard/Admin
- `[SearchPage]` เพิ่ม **View Toggle 3 โหมด** (Grid / List / Map+Cards)
  - **Grid** — cards 4 คอลัมน์ ไม่มี map
  - **List** — compact rows ไม่มี map
  - **Map+Cards** — map sticky 45vh บนสุด + cards 4 คอลัมน์ด้านล่าง
- `[SearchPage]` เพิ่ม **"ประมูลวันนี้"** ใน status filter — query `asset_bid_rounds`
  หา `asset_id` ที่ `bid_date = today` ก่อน แล้ว `.in('id', ids)`
- `[SearchPage]` ลบ sort **"ล่าสุด (ดึงข้อมูล)"** (`scraped_at.desc`) ออก
  เปลี่ยน default sort เป็น `ischeck_date.desc` (วันที่ประกาศใหม่สุด)
- `[SearchPage]` เพิ่ม sort: พื้นที่มากสุด/น้อยสุด, ผ่านนัดมากสุด/นัดน้อยสุด
- `[SearchPage]` **Hover card → highlight pin** ใน Map+Cards view
  `onMouseEnter` → set `hoverId` → LeafletMap ขยาย marker ที่ hover
- `[SearchPage]` Map+Cards — map ใช้ `.map-sticky-container` (`position: sticky;
  top: var(--nav-h)`) map ล็อกอยู่ใต้ navbar ขณะ cards เลื่อนผ่าน
- `[SearchPage]` ยกเลิก sticky filter bar — filter bar scroll หายขึ้นไปได้ตามปกติ

#### SearchFilters.jsx
- `[SearchFilters]` เปลี่ยน layout จาก sidebar ซ้าย → **horizontal dropdown row**
  แสดงเป็น pill-style dropdown: จังหวัด | อำเภอ | ตำบล | ประเภท | ราคา | สถานะ
- `[SearchFilters]` dropdown จังหวัด/อำเภอ/ตำบล cascade ใช้ `useGeoFilter` hook
- `[SearchFilters]` ปุ่ม "ล้างทั้งหมด" แสดงเฉพาะเมื่อมี active filter
- `[SearchFilters]` เพิ่ม preset ราคา < 1M / 3M / 5M แบบ chip toggle
- `[SearchFilters]` status option เพิ่ม **"ประมูลวันนี้"**

#### PropertyCard.jsx
- `[PropertyCard]` เพิ่ม prop `variant`: `'horizontal'` / `'grid'` / `'list'`
- `[PropertyCard]` **horizontal** — รูปซ้าย ข้อมูลขวา ข้อมูลครบทุกช่อง
  แก้ปัญหาข้อมูลตกบรรทัด: ลบ `min-height` → auto height ตาม content
- `[PropertyCard]` **grid** — รูปบน aspect-ratio 4/3, badges overlay บนรูป,
  ข้อมูลล่าง ใช้ใน Grid view และ Map+Cards view
- `[PropertyCard]` **list** — compact row: รูปเล็ก | badges | ที่ตั้ง | ราคา | score
- `[PropertyCard]` เพิ่ม prop `onMouseEnter / onMouseLeave` สำหรับ hover → map sync

#### Navbar.jsx
- `[Navbar]` Logo (`navbar-logo`) เปลี่ยนจาก `<div>` → `<Link to="/">` กดกลับหน้าหลักได้
  เพิ่ม hover opacity เพื่อ feedback ว่ากดได้
- `[Navbar]` เพิ่ม `.navbar-inner` wrapper `max-width: 1400px; margin: 0 auto`
  ทำให้ logo/search/links อยู่ในกรอบเดียวกับ content ด้านล่าง
  background navbar ยังคงเต็มจอเหมือนเดิม

#### index.css — Sections 21-23
- `[css]` **Section 21** — Search Page New Layout
  - `.search-page-wrap` max-width 1400px centered
  - `.filter-bar` horizontal pill dropdown bar + `.filter-bar-select` pill style
  - `.results-bar-new` flex row: count ซ้าย / sort+pagesize+toggle ขวา
  - `.view-toggle` + `.view-btn` 3 ปุ่ม Grid / List / Map+Cards
  - `.cards-grid` grid 4 col + `.property-card-grid` vertical card
  - `.cards-list` + `.property-card-list` compact row + `width: 100%`
  - `.map-cards-layout` + `.map-cards-map` map บน cards ล่าง
  - `.property-card { min-height: unset }` — auto height
- `[css]` **Section 22** — Responsive breakpoints (Grid columns)
  - `>1280px` → 4 col
  - `1024–1280px` → 3 col
  - `860–1024px` → 3 col + hide map panel
  - `640–860px` → 2 col
  - `<640px` → 2 col compact
  - `<480px` → card แนวตั้ง รูปบน ข้อมูลล่าง
- `[css]` **Section 23** — Map Sticky + List card mobile fix
  - `.map-sticky-container` `position: sticky; top: var(--nav-h); height: 45vh`
  - `.property-card-list` `width: 100%` กว้างเต็มทุกขนาดจอ
  - responsive list mobile: `grid-template-columns: 72px 1fr auto` บนจอ ≤640px
- `[css]` `.navbar` เปลี่ยนเป็น block + `.navbar-inner` max-width 1400px centered
- `[css]` `.navbar-logo` เพิ่ม `text-decoration: none` + hover opacity

---

## 2026.08.11-1

### Added — AdminPage: modal "รายการใหม่" ต่อ crawler run

- `[AdminPage]` ตาราง Crawler Runs เพิ่มคอลัมน์ "รายการใหม่" — ปุ่มสีเขียวโชว์ตัวเลขจาก
  `crawler_runs.total_records_new` (query field ใหม่) หรือ "ดูรายการ" ถ้ารอบนั้นยังไม่มี
  ค่านี้ใน DB (deploy ก่อนหน้า `led_uploader.py` เวอร์ชันที่เซ็ตค่าคอลัมน์นี้)
- `[AdminPage]` `isLedRun()` helper กรองให้ปุ่มนี้โชว์เฉพาะรอบ LED/upload เท่านั้น
  (รอบ landsmaps ไม่มีแนวคิด "รายการใหม่" ของ assets)
- `[AdminPage]` กดปุ่ม → เปิด modal query ตรงจาก Supabase (`assets.created_at` อยู่ใน
  ช่วง `started_at`–`finished_at` ของ run นั้น) ไม่ต้องเพิ่ม backend endpoint เพราะ RLS
  + GRANT ให้ `anon` อ่าน `assets` ได้อยู่แล้ว (migration `0007`/`0008`)
- `[AdminPage]` รอบเก่าที่ `total_records_new` เป็น `null` — เปิด modal ครั้งแรกแล้วเติม
  ค่านี้เข้า state ทันทีจาก `count: 'exact'` ของ query จริง (โชว์ตัวเลขถูกต้องโดยไม่ต้อง
  รอ backend อัพเดต)

### Added — modal: คอลัมน์ลำดับ / ที่ตั้งตามโฉนด / ราคาเต็ม

- `[AdminPage]` เพิ่มคอลัมน์ `#` (ลำดับรายการ) เป็นคอลัมน์แรกสุด
- `[AdminPage]` ที่ตั้งเปลี่ยนจาก `city/ampur/tumbol` (ที่ตั้งจริง) เป็น
  `led_province_name` / `deedampur` / `deedtumbol` (ที่ตั้งตามโฉนด — ตรงกับที่ใช้เทียบ
  พิกัดกับ LandsMaps จริงๆ)
- `[AdminPage]` `fmtBahtExact()` — ราคาประเมินแสดงจำนวนเต็มจริงมีคอมม่าคั่นหลัก
  (เช่น `1,520,000 ฿`) เลิกย่อเป็น "ล้าน"/"K" แบบเดิม

### Added — modal: คอลัมน์เลขโฉนด + Lat/Long พร้อม sub-row ขยายดูรายแปลง

- `[AdminPage]` คอลัมน์ "เลขโฉนด" ดึงจาก `assets.deedno` (array ที่ parse แล้ว) แทน
  `deedno_raw` (string ดิบ) — ยังคง select `deedno_raw` ไว้ใน query เพื่อ export ให้
  `landsmaps_collector_local.py` ใช้ parse ต่อ (ไม่ได้ใช้แสดงผลอีกต่อไป)
- `[AdminPage]` เพิ่มคอลัมน์ "Lat" / "Long" ต่อจากคอลัมน์เลขโฉนด — ดึงจากตาราง `parcels`
  ผ่าน `asset_parcels` (join ตรง `parcelno === deedno`), แบ่ง query เป็น chunk ละ 200
  asset id กัน URL ยาวเกินตอน asset เยอะ (`fetchParcelsForAssets()`)
- `[AdminPage]` asset ที่มีโฉนดเดียว → โชว์ lat/long ในแถวหลักได้เลย
- `[AdminPage]` asset ที่มีหลายโฉนด → คอลัมน์เลขโฉนดกลายเป็นปุ่มกดได้ (`.deedno-cell.clickable`)
  โชว์ "N แปลง (…)" แถวหลัก lat/long เป็น "—" (มีได้หลายค่า ใส่แถวเดียวไม่ได้) — กดแล้ว
  ขยายเป็น sub-row (`.deedno-subrow`) แทรกใต้แถวนั้น ทีละแปลง พร้อม lat/long ของมัน
  ขยายได้พร้อมกันหลายแถว (เก็บ state เป็น `Set` ของ asset id ที่เปิดอยู่)
- `[AdminPage]` แปลงที่ยังไม่เคยรัน landsmaps ให้ ไม่ว่าจะแถวหลักหรือ sub-row จะโชว์ lat/long
  เป็น "—" — ใช้เช็คได้ตรงๆ ว่า export JSON ไปรันรอบไหนแล้วดึงพิกัดมาได้ครบหรือยัง

### Added — Export JSON

- `[AdminPage]` ปุ่ม "⬇ Export JSON" วางคู่กับปุ่ม "ปิด" มุมขวาบนของ modal
- `[AdminPage]` `exportNewAssetsJson()` — query **ทุกแถวจริง** ของรอบนั้น (ไม่ตัดที่ 500
  แบบตาราง preview ในหน้าจอ) แบ่งหน้าด้วย `.range()` กัน PostgREST cap ที่ 1,000
  แถว/ครั้ง แล้ว trigger download ผ่าน `Blob` + `URL.createObjectURL`
- `[AdminPage]` field ที่ export (`NEW_ASSETS_FIELDS`) ตรงกับที่
  `landsmaps_supabase.get_new_assets()` ฝั่ง backend ใช้อยู่แล้วพอดี — เอาไฟล์ไปรันกับ
  `landsmaps_collector_local.py --file <ไฟล์นี้>` ได้ทันทีไม่ต้องแปลง field เพิ่ม
- `[AdminPage]` ชื่อไฟล์ที่ export: `tpis_new_assets_run{run_id}_{วันที่ started_at}.json`
  ข้างในมี `run_id`, `started_at`, `finished_at`, `exported_at`, `total`, `assets`

### Changed — index.css

- `[index.css]` `.new-items-modal` ขยายความกว้างจาก `max-width: 820px; width: 92vw` เป็น
  `max-width: 1880px; width: 97vw` (เกือบเต็มจอ ให้เห็นคอลัมน์ lat/long ได้สบาย) และ
  `max-height` จาก `82vh` เป็น `90vh`
- `[index.css]` เพิ่ม `.abtn.new-items-btn` (สีเขียว) ให้ specificity เท่ากับ
  `.abtn.secondary` เดิมและมาทีหลังใน stylesheet เพื่อ override สีให้ถูกต้อง
- `[index.css]` เพิ่ม `.deedno-cell.clickable` (hover highlight, cursor pointer) และ
  `.deedno-subrow` / `.deedno-subrow-spacer` / `.deedno-subrow-value` สำหรับแถวย่อยที่
  ขยายดูพิกัดรายแปลง

### Workflow ที่ได้จากการแก้รอบนี้

เปิดหน้า Admin → LED run เสร็จ → กดดู "รายการใหม่" → กด Export JSON → เอาไฟล์ไปรัน
`landsmaps_collector_local.py --file <ไฟล์>` บนเครื่อง (ดู `CHANGELOG_110826.md` ฝั่ง
backend) → กลับมาเปิด modal เดิมอีกครั้ง (เปิดใหม่ = query สด) เพื่อเช็คว่าเลขโฉนดไหนดึง
พิกัดมาได้แล้วบ้าง โดยไม่ต้องออกไปเปิด SQL Editor หรือดูจากที่อื่น
---

## 2026.08.05-1

### Changed — AdminPage show new list for each new crawler run

#### AdminPage.jsx + index.css
- ตาราง Crawler Runs เพิ่มคอลัมน์ "รายการใหม่" — ปุ่มสีเขียวโชว์ตัวเลขจาก `total_records_new` (หรือ "ดูรายการ" ถ้ายังไม่มีค่าเก่า)
- กดปุ่ม → เปิด modal query `assets` ตรงจาก Supabase (`created_at` อยู่ในช่วงของ run นั้น) แสดงเป็นตาราง เลขที่/จังหวัด/อำเภอ-ตำบล/ประเภท/ราคาประเมิน/เวลาที่เพิ่ม (limit 500 กันโหลดหนัก)
- ไม่ต้องเพิ่ม backend endpoint ใหม่ เพราะ RLS + GRANT ให้ `anon` อ่าน `assets` ได้อยู่แล้ว (migration 0007/0008)

---

## 2026.08.02-1

### Changed — SearchPage Redesign: Layout + View Modes + Responsive

#### SearchPage.jsx — Layout ใหม่ทั้งหมด
- `[SearchPage]` เปลี่ยน layout จาก 3-panel (sidebar + results + map) เป็น full-width centered
  `max-width: 1400px` ไม่เต็มจอ มี margin ซ้ายขวาเหมือน Dashboard/Admin
- `[SearchPage]` เพิ่ม **View Toggle 3 โหมด** — Grid / List / Map+Cards
  - **Grid** — cards 4 คอลัมน์ ไม่มี map
  - **List** — compact rows ไม่มี map
  - **Map+Cards** — map เต็มความกว้าง 50vh บนสุด + cards 4 คอลัมน์ด้านล่าง scroll ได้ปกติ
- `[SearchPage]` เพิ่ม **"ประมูลวันนี้"** ใน status filter
  query `asset_bid_rounds` หา `asset_id` ที่ `bid_date = today` ก่อน แล้ว `.in('id', ids)`
- `[SearchPage]` ลบ sort **"ล่าสุด (ดึงข้อมูล)"** (`scraped_at.desc`) ออก
  เปลี่ยน default sort เป็น `ischeck_date.desc` (วันที่ประกาศใหม่สุด)
- `[SearchPage]` เพิ่ม sort: พื้นที่มากสุด/น้อยสุด, ผ่านนัดมากสุด/นัดน้อยสุด
- `[SearchPage]` **Hover card → highlight pin บน Map+Cards view**
  `onMouseEnter` → set `hoverId` → LeafletMap ขยาย marker ที่ hover
- `[SearchPage]` HeroStats และ FilterChips ย้ายมาอยู่ใน `search-page-new` layout
- `[SearchPage]` Filter sticky ใต้ navbar — scroll down แล้ว filter bar ยังเห็น

#### SearchFilters.jsx — เปลี่ยนจาก sidebar → horizontal filter bar
- `[SearchFilters]` เปลี่ยน layout จาก sidebar ซ้าย → **horizontal dropdown row**
  แสดงเป็น pill-style dropdown: จังหวัด | อำเภอ | ตำบล | ประเภท | ราคา | สถานะ
- `[SearchFilters]` dropdown จังหวัด/อำเภอ/ตำบล cascade ใช้ `useGeoFilter` hook เหมือนเดิม
- `[SearchFilters]` ปุ่ม "ล้างทั้งหมด" แสดงเฉพาะเมื่อมี active filter
- `[SearchFilters]` เพิ่ม preset ราคา < 1M / 3M / 5M แบบ chip toggle
- `[SearchFilters]` status option เพิ่ม **"ประมูลวันนี้"**

#### PropertyCard.jsx — 3 Variants
- `[PropertyCard]` เพิ่ม prop `variant`: `'horizontal'` / `'grid'` / `'list'`
- `[PropertyCard]` **horizontal** (เดิม) — รูปซ้าย ข้อมูลขวา ข้อมูลครบทุกช่อง
  แก้ปัญหาข้อมูลตกบรรทัด: ลบ `min-height` ออก → auto height ตาม content
- `[PropertyCard]` **grid** — รูปบน (aspect-ratio 4/3), ข้อมูลล่าง, badges overlay บนรูป
  ใช้ใน Grid view และ Map+Cards view
- `[PropertyCard]` **list** — compact row: รูปเล็ก | badges | ที่ตั้ง | ราคา | score
- `[PropertyCard]` เพิ่ม prop `onMouseEnter / onMouseLeave` สำหรับ hover → map sync

#### index.css — Sections 21-22
- `[css]` **Section 21** — Search Page New Layout
  - `.search-page-wrap` max-width 1400px centered
  - `.filter-bar` horizontal pill dropdown bar
  - `.filter-bar-select` pill style dropdown + `.active` state
  - `.results-bar-new` flex row: count ซ้าย / sort+pagesize+toggle ขวา
  - `.view-toggle` + `.view-btn` 3 ปุ่ม Grid/List/MapCards
  - `.cards-grid` grid 4 col + `.property-card-grid` vertical card
  - `.cards-list` + `.property-card-list` compact row
  - `.map-cards-layout` + `.map-cards-map` map บน cards ล่าง
  - `.property-card { min-height: unset }` — auto height
- `[css]` **Section 22** — Responsive breakpoints
  - `>1280px` → 4 col
  - `1024-1280px` → 3 col
  - `860-1024px` → 3 col (hide map panel)
  - `640-860px` → 2 col
  - `<640px` → 2 col compact
  - `<480px` → card แนวตั้ง (รูปบน ข้อมูลล่าง)

---

## 2026.07.31-1

### Changed — Search & Filter: ครบทุก feature ที่ค้าง

#### useGeoFilter.js (ใหม่) — `src/hooks/useGeoFilter.js`
- `[hook]` shared custom hook สำหรับ cascading dropdown จังหวัด → อำเภอ → ตำบล
  ใช้ร่วมกันทั้ง SearchFilters และ MapPage ไม่ต้องเขียน fetch logic ซ้ำ
  - `useGeoFilter(ledProvinceId, districtId)` → `{ districts, subdistricts, loadingDist, loadingSub }`
  - fetch districts เมื่อ `ledProvinceId` เปลี่ยน จาก `th_provinces → th_districts`
  - fetch subdistricts เมื่อ `district_id` เปลี่ยน จาก `th_subdistricts`

#### SearchFilters.jsx — เพิ่ม dropdown ตำบล (ระดับ 3)
- `[SearchFilters]` ใช้ `useGeoFilter` hook แทนการ fetch ใน component โดยตรง
- `[SearchFilters]` เพิ่ม dropdown ตำบล cascade จากอำเภอ
  filter state เพิ่ม `district_id` (ส่งต่อให้ hook fetch subdistricts) และ `tumbol` (ชื่อ ส่งไป query)
- `[SearchFilters]` reset `district_id` และ `tumbol` เมื่อเปลี่ยนจังหวัด
  reset `tumbol` เมื่อเปลี่ยนอำเภอ

#### SearchPage.jsx — sync map + deed filter + sort + page size
- `[SearchPage]` **Pin sync กับผลค้นหา** — `fetchMapPts` ส่ง filter ครบทุกตัว:
  `ampur`, `tumbol`, `price_min`, `price_max`, `q`, `status`
- `[SearchPage]` **Filter ค้นจาก deed fields** — เปลี่ยนจาก `.eq('city', f.city)` →
  `.or('city.eq.X,deedcity.eq.X')` ทั้ง city, ampur, tumbol
  ทำให้ค้นหาได้แม้ทรัพย์มีข้อมูลเฉพาะ deed fields
- `[SearchPage]` **Items per page selector** — dropdown 10/20/30/50 ต่อหน้า
  ใน results bar ด้านซ้ายของ sort selector
- `[SearchPage]` **Sort options เพิ่ม 4 รายการ:**
  - พื้นที่มากสุด / น้อยสุด (`rai.desc` / `rai.asc`)
  - ผ่านนัดมากสุด / นัดน้อยสุด (`latest_round_no.desc` / `.asc`)
- `[SearchPage]` filter state เพิ่ม `district_id`, `tumbol`
- `[SearchPage]` global search `q` เพิ่ม `deedcity` ใน `.or()`

#### MapPage.jsx — filter ครบเหมือน SearchPage
- `[MapPage]` ใช้ `useGeoFilter` hook เพิ่ม dropdown อำเภอ + ตำบล cascade
- `[MapPage]` Filter ใหม่ 2 ตัว (checkbox):
  - ✅ **ใหม่ ≤7 วัน** — `ischeck_date >= now()-7days`
  - ✅ **ยังไม่เคยประมูล** — `latest_round_no IS NULL`
- `[MapPage]` Filter ราคาประเมิน min/max + preset < 1M / 3M / 5M
- `[MapPage]` Filter city/ampur/tumbol ค้นจาก deed fields ด้วย `.or()`
- `[MapPage]` Legend ย้ายลง bottom ของ sidebar ให้ filter อยู่บน

---

## 2026.07.28-1

### Changed — Map: pin 4 สี + NEW badge + popup พื้นที่ + Option C

#### LeafletMap.jsx — pin logic ใหม่ 5 ระดับ
- `[LeafletMap]` เปลี่ยนจาก 3 สี → 5 สี ตาม priority:
  1. 🔴 แดง — ขายแล้ว
  2. ⚫ เทา — ปิดแล้ว
  3. 🟢 เขียวอ่อน + **N** — ใหม่ ≤7 วัน (latest_round_no IS NULL + ischeck_date ≤ 7 วัน)
  4. 🟢 เขียวเข้ม — ยังไม่เคยประมูล (latest_round_no IS NULL)
  5. 🔵 น้ำเงิน — เปิดประมูลแล้ว
- `[LeafletMap]` pin สีเขียวใช้ DivIcon แสดงตัว "N" ตรงกลาง + CSS pulse animation
- `[LeafletMap]` Tooltip แสดง NEW badge สำหรับรายการใหม่

#### SearchPage.jsx
- `[SearchPage]` fetchMapPts select เพิ่ม latest_round_no, ischeck_date
- `[SearchPage]` limit เพิ่มจาก 1000 → 3000

#### MapPage.jsx
- `[MapPage]` select เพิ่ม rai, ngan, wa, ischeck_date, latest_round_no
- `[MapPage]` Legend เพิ่มเป็น 5 แถวตาม pin color logic ใหม่
- `[MapPage]` popup แสดง **พื้นที่** (fmtArea) แทนราคาที่ดินกรมที่ดิน
- `[MapPage]` **Option C** — กด marker ที่มีหลาย asset พิกัดเดียวกัน แสดง list ทั้งหมด
  แต่ละรายการมี: รูป, ประเภท, สถานะ, NEW badge, พื้นที่, ราคา, ปุ่ม "ดู" → detail page
  detect โดยเช็ค lat/lng ห่างกันไม่เกิน 0.00001 องศา

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
