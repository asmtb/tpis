# TPIS Web Changelog

รูปแบบเวอร์ชัน: `YYYY.MM.DD-N` (วันที่ deploy + ลำดับที่ deploy ในวันนั้น)
แต่ละบรรทัดระบุ component ที่กระทบใน `[ ]`

`[WIP]` = ยังทำไม่ครบทุกกลุ่มที่วางแผนไว้ ยังไม่ deploy จริง

---

## 2026.08.29-1

### Changed — Price Tier Chart: แสดง 4 แท่งเสมอ (โปรเจกชันล่วงหน้า)

พบจากการทดสอบจริงว่าทรัพย์ที่เพิ่งมีนัดเดียว (นัด 1 ยังไม่มีผล) แสดงกราฟแค่
1 แท่ง ไม่ตรงกับที่ตั้งใจไว้ — แก้ให้กราฟแสดง **4 แท่งเสมอ** เมื่อยังไม่ปิด
ประมูล โดยแยกชัดเจนระหว่างข้อมูลจริงกับข้อมูลคาดการณ์:

- `[DetailPage.jsx]` เขียน `computeChartRounds()` แทน `computeRoundTiers()`
  เดิม — เปลี่ยนจาก "หยุดกราฟที่นัดแรกที่ยังไม่รู้ผล" เป็น "เดินตามข้อมูล
  จริงจนถึงนัดที่ยังไม่รู้ผล (นัดนั้นเองยังเป็นข้อมูลจริง เพราะราคารู้แน่นอน
  แล้ว) จากนั้น**โปรเจกชันต่อ**จนครบ 4 แท่งเสมอ โดยสมมติว่านัดที่ยังไม่ถึง
  จะ 'งดขายไม่มีผู้สู้ราคา' ไปเรื่อยๆ (เหมือนกลไกเดียวกับที่คำนวณ tier จริง
  ทุกประการ ต่างกันแค่ที่มาของ input)"
  - ใช้ `bid_date` จริงจากข้อมูลที่มีอยู่แล้วสำหรับนัดโปรเจกชัน ถ้า LED
    ประกาศวันนัดนั้นไว้ล่วงหน้าแล้ว (ไม่ต้องเดาวันเอง)
- `[DetailPage.jsx]` แท่งที่เป็น **ข้อมูลจริง** (เกิดแล้ว/กำลังรอผล) ใช้สี
  ตาม tier ปกติ (น้ำเงิน/ฟ้า/ส้ม/เขียว) ส่วนแท่งที่เป็น **โปรเจกชัน**
  (ยังไม่ถึงคิว เป็นการคาดการณ์ล้วนๆ) ใช้ **สีเทา** (`--chart-grey`, ตัวแปร
  ใหม่) เสมอ ไม่ว่า tier จะเป็นเท่าไหร่ — แยกให้ชัดว่าอันไหนคือข้อมูลยืนยัน
  แล้ว อันไหนคือการประมาณการ

### Changed — Price Tier Chart: ทรัพย์ที่ปิดประมูลแล้ว

- `[DetailPage.jsx]` เพิ่ม prop `isClosed` (ผูกกับ `asset.is_closed` ที่มี
  อยู่แล้วในข้อมูลที่ query มา ไม่ต้องแก้ query เพิ่ม) ส่งเข้า
  `<PriceTierChart>`:
  - ถ้า `is_closed = true` → **ทุกแท่งเป็นสีเทาหมด** ไม่มี blink เลย
    (สีไล่ tier สื่อความหมาย "โอกาสสำหรับผู้ซื้อ" ซึ่งไม่มีความหมายอีกต่อไป
    เมื่อประมูลจบแล้ว ไม่ว่าจะขายได้หรืองดขายจนหมดนัด)
  - และแสดง **ทุกนัดจริงที่มีอยู่** โดยไม่จำกัดที่ 4 แท่งอีกต่อไป (เพราะเป็น
    ข้อมูลจริงทั้งหมดแล้ว ไม่ใช่การคาดเดา ไม่มีเหตุผลต้องจำกัดจำนวน)

### Changed — Label บนกราฟ: ย่อขนาด + เปลี่ยนรูปแบบ

- `[DetailPage.jsx]` เพิ่ม `fmtCompactPrice()` — ราคาบนแท่งกราฟแบบย่อ ไม่มี
  สัญลักษณ์ ฿ (เช่น `1.8M`, `750K`) แทนตัวเลขเต็มแบบเดิม เพื่อประหยัดพื้นที่
  โดยเฉพาะตอนแสดงหลายแท่ง (ทรัพย์ปิดแล้วอาจมีถึง 8 แท่ง)
- `[DetailPage.jsx]` เปลี่ยนข้อความใต้แท่งจาก `(ลดราคา X%)` เป็น `(ลด X%)`
  ให้สั้นลง
- `[DetailPage.jsx]` เพิ่ม `fmtDateShort()` — วันที่ใต้แท่งเปลี่ยนจากรูปแบบ
  เต็ม (`29 พ.ค. 2569`) เป็นแบบย่อ `29/05/69` **เฉพาะใน chart นี้จุดเดียว**
  ไม่กระทบ `fmtDate()` ที่ยังใช้รูปแบบเต็มทั่วทั้งหน้าเหมือนเดิม

### Fixed — Info popover ไอคอน ⓘ: มองไม่ออกว่าเป็นปุ่ม + เนื้อหาโดนตัด

- `[DetailPage.jsx]` เปลี่ยนไอคอนจากตัวอักษร "i" ธรรมดาเป็น SVG info-circle
  (เส้น stroke สไตล์เดียวกับไอคอนอื่นในเว็บ) พร้อมเพิ่มกรอบวงกลมชัดเจนขึ้น
  (`border: 1.5px solid var(--border)`) ให้ดูเป็นปุ่มที่กดได้จริง แทนที่จะ
  ดูเหมือนตัวหนังสือเฉยๆ
- `[DetailPage.jsx]` **แก้ root cause ที่ popover เนื้อหาโดนตัดไม่ครบ**:
  เดิม popover ลอยด้วย `position:absolute` ธรรมดาภายใน `.panel` (การ์ด
  "วิเคราะห์ราคา") ซึ่งมี `overflow:hidden` (ใช้ทั่วเว็บเพื่อขอบมนของรูป)
  ทำให้เนื้อหาโดนตัดขอบตามกรอบการ์ดทันทีที่ล้นออกไป — เปลี่ยนมาใช้
  **React Portal** (`createPortal` จาก `react-dom`) render popover ไปที่
  `document.body` ตรงๆ แล้วคำนวณตำแหน่งด้วย `getBoundingClientRect()` ของ
  ปุ่มตอนเปิด ใช้ `position:fixed` วางประกบ — หลุดออกจากข้อจำกัดของ parent
  ที่ตัดขอบได้แล้ว พร้อม clamp ตำแหน่งซ้ายไม่ให้ล้นขอบจอ (`Math.min`/
  `Math.max` กับ `window.innerWidth`)
- `[index.css]` เขียน `.info-popover-panel` ใหม่ (ลบ `position:absolute` /
  `top` / `left` เดิมออก เพราะตอนนี้ตำแหน่งกำหนดผ่าน inline style จาก JS
  แทน) ปรับ `.info-popover-btn` ให้รองรับ SVG + เพิ่ม border

### Fixed — Blink กระพริบทุกนัดที่ยังไม่ถึงคิว แทนที่จะกระพริบแค่นัดถัดไป

พบว่า LED ประกาศวันของทุกนัดไว้ล่วงหน้าเป็น `issale_code='0'` เหมือนกันหมด
จนกว่าจะถึงวันจริงของแต่ละนัด — logic เดิมเช็คแค่ "code=0 และวันยังไม่ผ่าน"
ทำให้นัดที่เหลือทั้งหมด (ไม่ใช่แค่นัดถัดไป) ติด flag "รอจริง" และกระพริบ
พร้อมกันหมดทุกกล่อง

- `[DetailPage.jsx]` คำนวณ `nextUpcomingRoundNo` (นัดแรกตามลำดับเวลาที่เข้า
  เงื่อนไข `code='0'` และ `bid_date >= todayStr`) ครั้งเดียวก่อน map รายการ
  นัด แล้วเทียบ `r.round_no === nextUpcomingRoundNo` เพื่อกำหนดว่าจะติด
  class `blink-slow` เฉพาะนัดนั้นนัดเดียว — นัดอื่นที่ยังไม่ถึงคิวยังคงมี
  พื้นหลังส้ม (`.upcoming`) เหมือนเดิม แค่ไม่กระพริบ
- `[DetailPage.jsx]` แก้ `PriceTierChart` ให้ blink logic สอดคล้องกัน:
  เฉพาะแท่งที่เป็นข้อมูลจริง (`!isProjected`) และยังไม่รู้ผล และวันยังไม่
  ผ่านเท่านั้นที่กระพริบ — แท่งโปรเจกชันไม่กระพริบเลย (เป็นการคาดการณ์
  ไม่ใช่นัดที่ต้องรอผลจริง)

### Changed — Map: เพิ่ม margin กันชนขอบการ์ด

- `[index.css]` `.detail-map` เดิมไม่มี margin/padding เลย ทำให้แผนที่ชน
  ขอบการ์ดสีขาวโดยตรง (เกิดจากตอนเพิ่มปุ่มแผนที่/นำทาง/Street View ใน
  `2026.08.28-1` ที่ตั้ง `panel-body{padding:0}` ให้ปุ่มกับแผนที่ชิดกัน แต่
  ลืมเผื่อระยะขอบให้ตัวแผนที่เอง) — เพิ่ม `margin: 0 16px 16px` ให้เข้าชุด
  กับ padding ที่ปุ่มด้านบนมีอยู่แล้ว

### Changed — Privacy: ซ่อนข้อมูล "จำเลย" ในรายละเอียดทรัพย์

- `[DetailPage.jsx]` ช่อง "จำเลย" (เดิมผูกกับ `asset.person2`) เปลี่ยนเป็น
  ข้อความคงที่ **"ตรวจสอบได้จากทรัพย์ประกาศขายทอดตลาดกรมบังคับคดี"** เสมอ
  ไม่แสดงข้อมูลจริงบนเว็บอีกต่อไป (ไม่กระทบข้อมูลใน DB — `person2` ยังถูก
  crawl/เก็บไว้ตามปกติ แค่ไม่ render ออกมาที่ฝั่ง frontend เท่านั้น)

---

## 2026.08.28-1

### Added — กราฟราคาเริ่มประมูลต่อนัด (Price Tier Chart)

- `[DetailPage.jsx]` เพิ่ม `computeRoundTiers(rounds, startPrice)` — คำนวณ
  tier ราคาเริ่มประมูลของแต่ละนัด ตามกฎ:
  - นัด 1 = 100% ของราคาเริ่มประมูล (`startPrice` ที่มีอยู่แล้ว priority
    `assetprice5 > 4 > 3 > 2`)
  - tier ขยับขึ้น 1 ขั้น (ลด 10 percentage point) **เฉพาะ**เมื่อนัดก่อนหน้ามี
    `issale_code === '3'` (งดขายไม่มีผู้สู้ราคา) เท่านั้น — งดขายด้วยเหตุผล
    อื่น (คู่ความขอ/เจ้าพนักงานสั่ง/ศาลสั่ง ฯลฯ) ไม่กระตุ้นการลดราคา คง tier
    เดิมไว้เท่านัดก่อนหน้า
  - tier สูงสุดที่ 3 (= 70% ของราคาประเมิน) เป็น floor ตายตัว ไม่ลดต่ำกว่านี้
  - หยุดคำนวณที่นัดแรกที่ยังไม่มีผลสรุป (`issale_code === '0'`) แล้วไม่แสดง
    นัดถัดไปอีก เพราะราคานัดที่ไกลกว่านั้นยังไม่แน่นอน (ขึ้นกับผลนัดที่ยัง
    ไม่เกิด) — ยืนยัน algorithm นี้กับตัวอย่างจริงที่ทดสอบ trace มือแล้ว
- `[DetailPage.jsx]` เพิ่ม `<PriceTierChart>` (ใช้ **Recharts** ที่มีอยู่แล้ว
  ในโปรเจกต์ ไม่ต้องติดตั้ง dependency เพิ่ม) วางไว้ใต้กล่อง "ราคาเริ่ม
  ประมูล" ในพาแนล "วิเคราะห์ราคา":
  - แท่งกราฟไล่สีตาม tier: นัด1=น้ำเงิน (`--accent`), tier1=ฟ้า (`--teal`,
    ตัวแปรใหม่), tier2=ส้ม (`--amber`), tier3=เขียว (`--green`) — สื่อความ
    หมายในตัวกราฟเอง (ยิ่งเขียว = ราคายิ่งต่ำ = โอกาสดีสำหรับผู้ซื้อ) ตั้งใจ
    ใช้โทนสีต่างจากคู่แข่งที่เคยดูเป็นตัวอย่าง (เขาใช้โทนน้ำตาล-ทอง)
  - แท่งของนัดที่ "รอผลจริง" (ยังไม่มีผลสรุป และวันยังไม่ผ่าน) กระพริบช้าๆ
    (ดู `.blink-slow` ด้านล่าง) พร้อมกับ badge ราคาด้านบนแท่ง
  - ป้ายใต้แท่ง: บรรทัด 1 "นัดที่ N", บรรทัด 2 "(ลดราคา X%)" ถ้ามีส่วนลด
    (X% คำนวณจากราคาเริ่มประมูลแรกสุดเสมอ ไม่ใช่ % ที่ลดจากแท่งก่อนหน้า),
    บรรทัด 3 วันที่นัด
- `[DetailPage.jsx]` เพิ่ม `<PriceRuleInfoPopover>` — ไอคอน "ⓘ" ข้างหัวข้อ
  กราฟ อธิบายเกณฑ์การลดราคาแบบละเอียด (ครบทั้ง 4 tier + ข้อควรระวังเรื่อง
  "งดขาย" ที่ไม่กระตุ้นการลดราคา) เปิดได้ 2 ทาง:
  - เมาส์ hover (จอคอมพิวเตอร์)
  - คลิก/แตะที่ไอคอน toggle เปิด-ปิด (รองรับจอมือถือที่ไม่มี hover)
  - click-outside ปิด popover — reuse pattern เดียวกับ `.navbar-dropdown`
    ใน `Navbar.jsx` (ref + mousedown listener)
- `[index.css]` เพิ่มตัวแปรสี `--teal` (light `#0891B2` / dark `#22D3EE`)
  และ style ทั้งหมดของ chart/popover: `.price-tier-chart-wrap`,
  `.price-tier-chart-hd`, `.price-tier-bar-label`, `.price-tier-round-label`,
  `.info-popover`, `.info-popover-btn`, `.info-popover-panel`

### Added — ปุ่ม แผนที่ / นำทาง / Street View

- `[DetailPage.jsx]` เพิ่มแถวปุ่ม 3 ปุ่มเหนือ Leaflet map ในพาแนล "ตำแหน่ง
  ทรัพย์" — ทั้งหมดเป็นลิงก์เปิด tab ใหม่ไป Google Maps ตรงๆ **ไม่ต้องมี
  Google Maps API key และไม่มีค่าใช้จ่ายใดๆ** (ต่างจาก Street View แบบ inline
  ที่ต้องมี API key + ผูก billing account ซึ่งตัดสินใจไม่ทำในรอบนี้):
  - 🗺️ แผนที่ → `google.com/maps?q=lat,long`
  - 🧭 นำทาง → `google.com/maps/dir/?api=1&destination=lat,long`
  - 👁️ Street View → `google.com/maps?layer=c&cbll=lat,long`
- `[index.css]` เพิ่ม `.detail-map-actions`, `.detail-map-action-btn`

### Fixed — สีป้ายนัดที่ "วันผ่านไปแล้วแต่ LED ไม่อัปเดต code" ยังเป็นสีส้ม

พบจากการตรวจสอบ UI หลัง `2026.08.21-3` — ตอนนั้นแก้แค่ **ข้อความ** จาก
"รอประมูล" เป็น "-" สำหรับนัดที่ `issale_code='0'` แต่ `bid_date` ผ่านไปแล้ว
แต่ลืมเปลี่ยน **class สี** ตามไปด้วย ยังใช้ `s0` (พื้นส้ม `--orange-lt`) ค้าง
อยู่ ทำให้แม้ข้อความจะถูกแล้วแต่สียังดูเหมือนสถานะ "รอประมูล" (เร่งด่วน)
ทั้งที่ควรเป็นสีเทาเหมือนนัดที่ปิดไปแล้วนัดอื่นๆ

- `[DetailPage.jsx]` เปลี่ยน `cls` จาก `'s0'` เป็น `'s-elapsed'` สำหรับกรณีนี้
  โดยเฉพาะ
- `[index.css]` เพิ่ม `.bid-status.s-elapsed { background: var(--surface-alt); color: var(--text-3); }`
  (สีเทาเดียวกับ `s3`/`s13`/`s25` ที่ใช้กับนัดปิดอื่นอยู่แล้ว)

### Added — Blink animation (ใช้ร่วมกัน 2 จุด)

- `[index.css]` เพิ่ม `@keyframes gentle-blink` + `.blink-slow` (opacity
  1↔0.5 ทุก 2.2 วินาที) พร้อม `@media (prefers-reduced-motion: reduce)`
  ปิด animation ให้อัตโนมัติเพื่อ accessibility
- `[DetailPage.jsx]` ใช้ class เดียวกันนี้ทั้ง 2 จุด ให้ animation ตรงกัน
  ทั้งเว็บ:
  - แท่งกราฟ (`PriceTierChart`) ของนัดที่รอผลจริง
  - กล่องนัดใน "นัดประมูล" ที่มี class `.upcoming` เดิม (นัดที่รอจริง —
    เดิมมีแค่ border/background สีส้มเด่น ตอนนี้เพิ่มกระพริบด้วย)

---

## 2026.08.27-1

### Added — modal "รายการใหม่" (AdminCrawlerPage): คอลัมน์สถานะพิกัด

- `[AdminCrawlerPage.jsx]` `fetchParcelsForAssets()` ดึง `verify_status` ของ
  parcel เพิ่ม (เดิมดึงแค่ `parcelno`/`latitude`/`longitude`)
- `[AdminCrawlerPage.jsx]` เพิ่มคอลัมน์ "สถานะ" ในตาราง modal — asset ที่มีโฉนด
  เดียวโชว์ badge สถานะจริงในแถวหลักได้เลย, asset ที่มีหลายโฉนดแถวหลักโชว์ "—"
  (มีได้หลายค่า ใส่แถวเดียวไม่ได้ เหมือน pattern เดียวกับ lat/long เดิม) ส่วน
  sub-row ที่กดขยายดูพิกัดรายแปลงจะโชว์สถานะแยกรายแปลงให้ครบ

### Added — ParcelStatusBadge.jsx: component ใหม่ใช้ร่วมกัน

- `[ParcelStatusBadge.jsx]` (ไฟล์ใหม่, `src/components/`) — ดึง badge สถานะ
  parcel ที่เคย copy โค้ดซ้ำกันอยู่ 2 ที่ (`AdminParcelsPage.jsx` และตอนนี้
  `AdminCrawlerPage.jsx` ที่เพิ่งเพิ่มคอลัมน์สถานะ) มารวมเป็น component เดียว
  ที่เดียวที่ต้องแก้ถ้าจะเพิ่ม/เปลี่ยน label หรือสีของสถานะใหม่ในอนาคต
- `[AdminParcelsPage.jsx]` เปลี่ยนมาใช้ `<ParcelStatusBadge status={row.verify_status} />`
  แทนโค้ด `<span className="parcel-status ...">` ที่เคย inline ไว้เอง — ลบ
  `VERIFY_STATUS_LABEL` ที่เคยประกาศซ้ำในไฟล์นี้ออกด้วย (ย้ายไปอยู่ใน
  `ParcelStatusBadge.jsx` แทน)

### Added — AdminCrawlerPage: Crawler Runs มี filter + pagination 100 รายการ/หน้า

- `[AdminCrawlerPage.jsx]` แยก query `crawler_runs` ออกจาก `Promise.all` เดิม
  (ที่โหลดพร้อม session/สถิติทรัพย์ตอนเข้าหน้าครั้งแรก) มาเป็นฟังก์ชัน
  `loadRuns()` ของตัวเอง — เรียกใหม่อัตโนมัติทุกครั้งที่ filter หรือเลขหน้าเปลี่ยน
  ผ่าน `useEffect([loadRuns])`
- `[AdminCrawlerPage.jsx]` filter ที่เพิ่ม (ตามที่เลือกไว้ตอนคุยแผน):
  - **Mode** — `upload` (LED) / `landsmaps` (ตรงกับค่าจริงที่ backend เขียนลง
    `crawler_runs.run_mode` — `led_uploader.py` ใช้ `"upload"`,
    `landsmaps_supabase.py` ใช้ `"landsmaps"` ไม่มีค่า `"led"` ตรงๆ)
  - **สถานะ** — `completed` / `partial` / `failed` / `running` (ตรงกับ CHECK
    constraint ของคอลัมน์ `status` ใน schema baseline)
  - **ช่วงวันที่** — กรองจาก `started_at`
  - เปลี่ยน filter ตัวไหนก็ตาม กลับไปหน้า 1 เสมอ (`applyRunsFilter()`)
- `[AdminCrawlerPage.jsx]` pagination 100 รายการ/หน้า (`RUNS_PAGE_SIZE = 100`)
  ใช้ `.range()` + `count: 'exact'` แบบเดียวกับที่ `AdminParcelsPage.jsx` ทำไว้
  ก่อนหน้า — ปุ่มก่อนหน้า/ถัดไป + เลขหน้า/จำนวนหน้ารวมอยู่ที่มุมขวาบนของ section
- `[AdminCrawlerPage.jsx]` หัวข้อ section เปลี่ยนจากนับ `runs.length` (นับแค่ที่
  โหลดมาในหน้าปัจจุบัน ผิดความหมาย) เป็น `runsTotal` จาก `count: 'exact'` ของ
  Supabase (จำนวนจริงทั้งหมดที่ตรง filter ไม่ใช่แค่หน้าที่เห็น)
- `[AdminCrawlerPage.jsx]` เพิ่ม loading state (`runsLoading`) ระหว่างโหลด/
  เปลี่ยนหน้า/เปลี่ยน filter ของตาราง Crawler Runs โดยเฉพาะ (แยกจาก loading
  state หลักของทั้งหน้าที่คุมแค่ session/สถิติทรัพย์)
- `[AdminCrawlerPage.jsx]` re-use `.parcels-filter-grid` / `.pf-field` CSS class
  เดิมจาก `AdminParcelsPage.jsx` สำหรับ filter bar ใหม่นี้ — ไม่ต้องเพิ่ม CSS
  ใหม่เลย หน้าตา filter เหมือนกันทั้ง 2 หน้า

### Context

งานรอบนี้ตอบ 3 ข้อที่ขอมาพร้อมกัน: (1) คอลัมน์สถานะใน modal รายการใหม่ (2)
pagination + filter ของ Crawler Runs (3) คำถามว่าจะเพิ่มคอลัมน์ใหม่ในอนาคตต้อง
แก้ไฟล์ไหน — คำตอบคือ:
  - เพิ่ม/แก้คอลัมน์ใน modal "รายการใหม่" → แก้ที่ `AdminCrawlerPage.jsx`
    (ส่วน state `newAssets`/`NEW_ASSETS_FIELDS` และตารางใน modal)
  - เพิ่ม/แก้คอลัมน์ในหน้า "จัดการโฉนด" → แก้ที่ `AdminParcelsPage.jsx`
    (ส่วน `NEW_ASSETS_FIELDS`/query `parcels`/`fetchRepresentativeAssets`
    และตารางหลักของหน้า)
  - ถ้าคอลัมน์ใหม่เป็น field จาก `assets` ที่ยังไม่เคย select มา ต้องเพิ่มชื่อ
    field เข้าไปใน select string ของ query ที่เกี่ยวข้องก่อน (เช่น
    `NEW_ASSETS_FIELDS` ในทั้งสองไฟล์ หรือ query ใน `fetchRepresentativeAssets`/
    `fetchParcelsForAssets`) ไม่งั้นข้อมูลจะเป็น `undefined` แม้จะเพิ่ม `<td>`
    ในตารางแล้วก็ตาม

---

## 2026.08.21-3

### Fixed — ป้ายสถานะรายนัดขึ้น "รอประมูล" ทั้งที่วันนัดผ่านไปแล้ว

พบจากทรัพย์ id=1306 — นัดที่ 2 (วันที่ 31 ก.ค. 2569) ขึ้น badge "รอประมูล"
ทั้งที่วันนั้นผ่านไปแล้ว (ปัจจุบัน 21 ส.ค. 2569) เพราะ LED เองก็ไม่เคย
อัปเดต `issale_code` ให้เหมือนกัน (ยังเป็น `"0"` ค้างอยู่) — เว็บ LED ต้นทาง
เองแสดง "-" สำหรับกรณีนี้ ไม่ใช่ "รอประมูล"

- `[DetailPage.jsx]` แก้ logic การแสดงผลรายนัดในส่วน "นัดประมูล" — เดิม
  ตัดสิน badge จาก `issale_code === '0'` เพียงอย่างเดียว ไม่ดู `bid_date`
  เลย ตอนนี้เพิ่มเงื่อนไข: ถ้า `issale_code === '0'` **และ** `bid_date`
  ผ่านไปแล้ว (เทียบกับวันนี้) → แสดง "-" แทน "รอประมูล" ส่วนนัดที่
  `issale_code === '0'` และ `bid_date` เป็นวันนี้/อนาคต ยังคงแสดง
  "รอประมูล" ตามปกติ (ไม่กระทบ)
  - เทียบวันที่แบบ **string** (`"YYYY-MM-DD" < todayStr`) แทนการสร้าง
    `Date` object มาเทียบกัน เพราะ `bid_date` จาก Supabase เป็น string
    รูปแบบนี้อยู่แล้ว และ `new Date("YYYY-MM-DD")` ใน JS ตีความเป็น UTC
    midnight เสมอ ถ้าเอามาเทียบกับ `Date` ท้องถิ่นตรงๆ อาจเพี้ยนวันได้
    ช่วงใกล้เที่ยงคืน — เทียบ string ตามรูปแบบเดียวกันปลอดภัยและง่ายกว่า
  - ไม่แตะ `issaleInfo()` ใน `utils.js`/`constants.js` เลย เพราะใช้แค่จุด
    เดียวในไฟล์นี้ — แก้ local logic ใน `DetailPage.jsx` แทน

### หมายเหตุ — เป็นแค่ครึ่งหนึ่งของปัญหาที่คุยกันไว้

ฉบับนี้แก้เฉพาะ**ป้ายรายนัด**บนหน้า detail (สิ่งที่ user เห็นตรงๆ) ส่วน
**badge/filter ภาพรวมของทรัพย์** ("เปิดประมูล"/"ปิดแล้ว" ที่ใช้ทั่วทั้งเว็บ
รวมถึงหน้าค้นหา) ขึ้นอยู่กับคอลัมน์ `assets.is_closed` ที่คำนวณจากฝั่ง
**backend** ตอน crawl — แก้แยกไว้ที่ `tpis-backend` (ดู
`CHANGELOG_2026.08.21-2.md` ของฝั่ง backend) ไม่เกี่ยวกับไฟล์ frontend เลย
ฉบับนี้แก้แค่ฝั่งเดียว ต้อง deploy backend คู่กันด้วยถึงจะครบตามที่วางแผนไว้

---

## 2026.08.21-2

### Added — หน้าจัดการบัญชี: ตั้งค่าแจ้งเตือนนัดประมูล (wishlist)

- `[AccountPage.jsx]` เพิ่ม section ใหม่ "แจ้งเตือนนัดประมูลทางอีเมล" อยู่
  เหนือฟอร์มเปลี่ยนรหัสผ่านเดิม:
  - checkbox เปิด/ปิดการแจ้งเตือน (`wishlist_notify_enabled`)
  - เมื่อเปิดแล้ว โชว์ chip ให้เลือกจำนวนวันล่วงหน้า **1 / 3 / 7 วันก่อนนัด**
    แบบ multi-select (เลือกได้พร้อมกันหลายค่า) เก็บเป็น
    `wishlist_reminder_days` (เช่น `[1,3,7]`)
  - validate ก่อน save: ถ้าเปิดแจ้งเตือนไว้แต่ไม่เลือกวันไหนเลย ขึ้น error
    "กรุณาเลือกอย่างน้อย 1 ช่วงเวลาแจ้งเตือน" กันไม่ให้บันทึกสถานะที่เปิด
    ไว้แต่ backend job ไม่มีวันมาเทียบเลย
  - โหลดค่าปัจจุบันจาก `public.users` (`select wishlist_notify_enabled,
    wishlist_reminder_days`) ตอน mount และบันทึกกลับด้วย
    `supabase.from('users').update(...)` แยกปุ่ม save ต่างหากจากฟอร์ม
    เปลี่ยนรหัสผ่าน (คนละ concern คนละ state)
  - error handling ตาม pattern เดียวกับที่แก้ใน `2026.08.21-1` (fallback
    ข้อความไทยกลางๆ + `console.error` log raw error เสมอ ไม่โชว์ค่าที่
    อ่านไม่รู้เรื่องแบบ `{}`)
- `[index.css]` เพิ่ม `.day-chip` (+ `.day-chip.active`) — ปุ่ม chip toggle
  ทรงกลมมนสำหรับเลือกวันแจ้งเตือน สไตล์เดียวกับปุ่มอื่นในระบบ (ใช้
  `var(--accent)` ตอน active)

### หมายเหตุ — ต้องมี migration ฝั่ง backend ก่อนใช้งานได้จริง

Section นี้ query/update ตาราง `public.users` โดยตรงผ่าน Supabase client
(ไม่ใช่ Auth API) ต้องมี **migration `0015_wishlist_reminder_prefs.sql`**
(ส่งแยกไว้ในชุดไฟล์ backend) รันก่อน ไม่งั้นจะเจอ 2 ปัญหา:

1. คอลัมน์ `wishlist_notify_enabled` / `wishlist_reminder_days` ยังไม่มีใน
   ตาราง → query 400 error
2. แม้มีคอลัมน์แล้วแต่ยังไม่ได้เพิ่ม RLS policy `"user update own profile"`
   → `update()` จะถูก RLS บล็อก **เงียบๆ** (คืน 0 แถวที่ถูกแก้ไข ไม่ error
   ให้เห็น) กดบันทึกแล้วดูเหมือนสำเร็จแต่ค่าจริงไม่เปลี่ยนเลย

### Context

เป็น UI-only ของฟีเจอร์ "แจ้งเตือนนัดประมูลของทรัพย์ใน wishlist ทางอีเมล"
ตามที่ตกลงกันไว้ว่าจะทำ UI ก่อนแล้วค่อยทำ backend — backend (Cloud Run Job
`wishlist_notify.py` ที่อ่านค่าพวกนี้ไปตัดสินใจส่งอีเมลจริง) ส่งแยกเป็นชุด
ไฟล์ backend คนละชุด (ดู `CHANGELOG_2026.08.21-1.md` ฝั่ง `tpis-backend`)

---

## 2026.08.21-1
 
### Fixed — SignUpPage / AccountPage: error message โชว์ `{}` แทนข้อความที่อ่านได้
 
- `[SignUpPage.jsx]` เดิม error handling หลัง `signUp()` fail เขียนไว้แค่
  `setError(err.message === 'User already registered' ? '...' : err.message)`
  — ถ้า `err.message` เป็น `undefined` หรือ Auth server คืน error object ที่
  ไม่มี field `message` มาตรฐาน (เช่นตอนที่ custom SMTP ส่งอีเมลยืนยันไม่
  สำเร็จกลางทาง แล้ว Auth server ส่ง error กลับมาไม่ครบ) จะได้ข้อความที่
  อ่านไม่รู้เรื่อง (พบจริงว่าขึ้น `{}` บนหน้าเว็บ) เปลี่ยนเป็น:
  - เช็ค `typeof err.message === 'string' && err.message.trim()` ก่อนใช้
    ค่านั้นแสดงผล
  - ถ้าไม่ผ่านเงื่อนไข fallback เป็นข้อความไทยกลางๆ
    "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" แทนที่จะปล่อยให้ React
    render ค่า raw ที่ไม่ใช่ string ที่อ่านได้
  - เพิ่ม `console.error('[SignUp] error:', err)` log raw error object ทุก
    ครั้งที่ fail ไว้เสมอ ช่วย debug ครั้งหน้าได้เร็วขึ้นโดยไม่ต้องเดาจาก
    ข้อความที่ user เห็นอย่างเดียว
- `[AccountPage.jsx]` แก้ error handling ของ `updateUser({ password })` ด้วย
  pattern เดียวกัน (fallback ข้อความไทย + `console.error` log) — จุดนี้ยัง
  ไม่เจอบั๊กจริงแต่เป็นความเสี่ยงแบบเดียวกัน แก้ป้องกันไว้ล่วงหน้าตอนพบ
  บั๊กที่ `SignUpPage.jsx`

### Discovered — Custom SMTP (Resend) กับ sender `onboarding@resend.dev` ใช้ด้วยกันไม่ได้
 
- `[infra]` ตั้งค่า Custom SMTP ใน Supabase (Authentication → Emails → SMTP
  Settings) ด้วย Resend (`smtp.resend.com`) เพื่อแก้ email template ภาษาไทย
  ได้ (ฟีเจอร์แก้ template ต้องมี custom SMTP ก่อนถึงจะใช้ได้ — ข้อจำกัดของ
  Supabase free tier) แต่ตั้ง sender เป็น `onboarding@resend.dev` (sender
  ทดสอบของ Resend เอง เพราะ ART ยังไม่มีโดเมนของตัวเองให้ verify)
- `[infra]` ทดสอบสมัครสมาชิกจริงแล้วเจอ error ทันที (แสดงเป็น `{}` ก่อนแก้
  frontend ข้างบน) — ต้นเหตุที่คาดไว้: `onboarding@resend.dev` ใช้ได้เฉพาะ
  ผ่าน Resend API เท่านั้น ไม่รองรับการส่งผ่าน SMTP relay ตรงๆ (ซึ่งเป็นวิธี
  ที่ Supabase Custom SMTP ใช้) ทำให้ Auth server ส่งอีเมลยืนยันไม่สำเร็จ
  ตอน `signUp()` แล้ว error กลับมาที่ frontend
- `[infra]` ทางแก้ชั่วคราวที่แนะนำ: **ปิด Custom SMTP** กลับไปใช้ email
  service ของ Supabase เอง (ใช้งานได้จริง แค่ branding เป็นของ Supabase —
  ไม่มี custom template ภาษาไทยจนกว่าจะเปิด custom SMTP ใหม่ได้) จนกว่า ART
  จะมีโดเมนของตัวเองมา verify กับ Resend
- `[infra]` ยังไม่ได้ยืนยัน root cause 100% เพราะไม่มีสิทธิ์เข้า Supabase
  Auth Logs โดยตรง — แนะนำเช็ค **Authentication → Logs** ที่ timestamp ที่
  สมัครแล้ว fail เพื่อดูข้อความ error จริงจาก Auth server ก่อนสรุปแน่นอน

### Context
 
พบระหว่างทดสอบ flow "สมัครสมาชิก → เช็คอีเมลยืนยัน" ของฟีเจอร์ Public
Sign-up ที่เพิ่งทำเสร็จใน `2026.08.20-2` — เป็นครั้งแรกที่ทดสอบ end-to-end
จริงหลัง deploy โค้ด sign-up ไปแล้ว บั๊ก frontend (`{}`) เป็นปัญหาจริงที่ต้อง
แก้ไม่ว่าจะแก้ SMTP หรือไม่ก็ตาม เพราะ error message ที่อ่านไม่ได้ทำให้
debug ยากขึ้นเสมอ ส่วนปัญหา SMTP/Resend เป็นเรื่อง infra config ที่ยัง
ต้องตัดสินใจว่าจะซื้อโดเมนหรือปิด custom SMTP ไปก่อน

---

## 2026.08.20-2
 
### Added — Public Sign-up (เปิดสมัครสมาชิกสาธารณะ)
 
- `[SignUpPage.jsx]` (ไฟล์ใหม่) — ฟอร์มสมัครสมาชิก email+password เรียก
  `signUp()` ใหม่ใน `AuthContext.jsx` รองรับทั้ง 2 กรณีตาม Supabase Auth
  "Confirm email" setting:
  - ถ้าปิด confirm email → `data.session` มาทันที → เข้าระบบเลย
  - ถ้าเปิด confirm email (ตั้งค่าไว้แล้วที่ Supabase Dashboard) →
    `data.session` เป็น `null` จนกว่าจะกดลิงก์ยืนยันในอีเมล → โชว์การ์ด
    "เช็คอีเมลเพื่อยืนยัน" ค้างไว้แทนที่จะ redirect ทันที
  - validate รหัสผ่านขั้นต่ำ 6 ตัวและต้องพิมพ์ซ้ำให้ตรงกันก่อน submit
- `[AuthContext.jsx]` เพิ่ม `signUp()` (`supabase.auth.signUp()`), แก้ comment
  บนสุดของไฟล์ที่เดิมเขียนว่า "มีแค่ admin คนเดียว ไม่มีหน้า sign-up สาธารณะ"
  ให้ตรงกับความเป็นจริงใหม่ — ย้ำว่า user ที่สมัครเองจะได้ `role='user'`
  เสมอ (มาจาก trigger `handle_new_user()` เดิมใน migration `0001` ที่ insert
  `public.users` ด้วย role default) ไม่มีทางได้ `role='admin'` ผ่านหน้าเว็บ
  เลย ต้องตั้งผ่าน SQL/Dashboard เท่านั้น
- `[SignInPage.jsx]` แก้ default redirect หลัง login จาก `/admin` (สมมติฐาน
  เดิมว่ามีแต่ admin login) → `/` (เพราะตอนนี้ user ทั่วไปก็ login ผ่านหน้า
  นี้ด้วย), หัวข้อจาก "เข้าสู่ระบบ Admin" → "เข้าสู่ระบบ" เฉยๆ, เพิ่มลิงก์
  "ยังไม่มีบัญชี? สมัครสมาชิก" ไปหน้า `/signup`
- `[App.jsx]` เพิ่ม route `/signup`
*หมายเหตุ — ต้องตั้งค่าที่ Supabase Dashboard เองด้วย (ไม่ใช่ในโค้ด):*
*Authentication → Providers → Email → เปิด "Allow new users to sign up" +*
*"Confirm email"; Authentication → URL Configuration → ตั้ง Site URL และ*
*Redirect URL ให้ชี้ไปที่โดเมนจริง (`https://tpis.pages.dev`) แทน*
*`http://localhost:3000` — ไม่งั้นลิงก์ยืนยันตัวตนในอีเมลที่ส่งจริงจะพัง*
 
### Added — Wishlist (บันทึกทรัพย์ที่สนใจ)
 
- `[WishlistContext.jsx]` (ไฟล์ใหม่) — ใช้ตาราง `public.user_watchlists` ที่
  มีอยู่แล้วตั้งแต่ baseline schema (`0001`, RLS policy "own watchlist" +
  table grant ให้ `authenticated` จาก migration `0012` ครบอยู่แล้ว) **ไม่มี
  SQL migration ใหม่เลย** — ตารางนี้มีอยู่แล้วแต่ยังไม่เคยมีหน้าเว็บใช้งาน
  จริงมาก่อน
  - ทำเป็น React Context (ไม่ใช่ hook เดี่ยวๆ) เพราะต้อง share state เดียวกัน
    ข้าม component — กด ♡ ใน `PropertyCard` ต้องอัปเดต badge count ใน
    `Navbar` ทันทีโดยไม่ต้อง refetch ใหม่ทั้งก้อน
  - `toggle(assetId)` ทำ optimistic update ก่อนยิง request จริง พร้อม
    rollback state ถ้า insert/delete ฝั่ง Supabase fail
  - โหลด asset_id ทั้งหมดที่ user ปัจจุบัน save ไว้ครั้งเดียวตอน mount
    (ผูกกับ `user` จาก `AuthContext` — เปลี่ยน user หรือ logout ก็ refetch
    ใหม่อัตโนมัติผ่าน `useEffect` dependency)
- `[PropertyCard.jsx]` เพิ่มปุ่ม ♡ (`WishlistHeart`) ทั้ง 3 variant
  (horizontal/grid/list) — คลิกแล้ว `stopPropagation()` + `preventDefault()`
  กันไม่ให้โดน `<Link>` ของการ์ดทั้งใบ navigate ไปหน้า detail ไปด้วย ถ้ายัง
  ไม่ login จะเด้งไป `/signin` พร้อมจำ path ปัจจุบันไว้ (`location.state.from`)
  เพื่อเด้งกลับมาอัตโนมัติหลัง login สำเร็จ
  - ตำแหน่งหัวใจต่าง variant: horizontal มุมขวาบนของรูป (`.card-img-heart`),
    grid มุมขวาล่าง (`.card-grid-heart` — เลี่ยงชนกับ score badge ที่อยู่
    ขวาบนอยู่แล้ว), list ต่อท้ายแถวแบบ static ไม่ absolute
- `[DetailPage.jsx]` เพิ่มปุ่ม ♡ ใหญ่ข้าง badges (type/status/saletypename)
  บน hero section ใช้ logic เดียวกับ `WishlistHeart` แต่เขียนเป็นปุ่มแยก
  พร้อม label "บันทึกรายการนี้" / "บันทึกแล้ว"
- `[WishlistPage.jsx]` (ไฟล์ใหม่) — หน้า `/wishlist` ดึง `asset_id` จาก
  `WishlistContext` แล้ว fetch รายละเอียดเต็มจากตาราง `assets` +
  เช็คพิกัดจาก `assets_map` (สำหรับ `hasCoord` prop) พร้อมกันด้วย
  `Promise.all()` — reuse `PropertyCard` variant `grid` เดิมทั้งหมด ไม่มี
  card component ใหม่ มี empty state ชวนกลับไปหน้าค้นหาถ้ายังไม่มีรายการ
  บันทึกไว้เลย
- `[RequireAuth.jsx]` (ไฟล์ใหม่) — route guard คู่กับ `RequireAdmin.jsx`
  เดิม แต่เช็คแค่ `!!user` ไม่บังคับ role — ใช้ครอบ `/wishlist` และ
  `/account` (user ทั่วไปเข้าได้ ไม่ต้องเป็น admin)
- `[App.jsx]` เพิ่ม route `/wishlist` ครอบด้วย `<RequireAuth>`, ห่อทั้งแอปด้วย
  `<WishlistProvider>` (อยู่ใต้ `<AuthProvider>` เพราะต้องใช้ `useAuth()`
  ข้างในเพื่อรู้ user ปัจจุบันก่อน fetch watchlist)

### Added — จัดการบัญชี (เปลี่ยนรหัสผ่าน)
 
- `[AccountPage.jsx]` (ไฟล์ใหม่) — หน้า `/account` ฟอร์มเปลี่ยนรหัสผ่านจริง
  เรียก `supabase.auth.updateUser({ password })` ตรงๆ (ผ่าน Auth API ไม่ใช่
  table query เลย RLS ไม่เกี่ยวข้อง), โชว์อีเมลปัจจุบันแบบ read-only,
  validate ความยาวขั้นต่ำ + พิมพ์ซ้ำตรงกันเหมือน `SignUpPage.jsx`
- `[App.jsx]` เพิ่ม route `/account` ครอบด้วย `<RequireAuth>`

### Changed — Navbar: เปลี่ยนจากโชว์อีเมลตรงๆ เป็น icon + dropdown menu
 
- `[Navbar.jsx]` เดิมโชว์อีเมล user เต็มๆ ค้างไว้บน navbar ตลอดเวลา
  (`.navbar-auth-email`) พร้อมปุ่ม "ออกจากระบบ" ลอยแยกต่างหาก — เปลี่ยนเป็น
  ไอคอนคน (👤) เดียว กดแล้วเปิด dropdown โครงสร้างตามลำดับที่ตกลงกันไว้:
  1. แถวแรก: อีเมล/ชื่อ user (ไม่ใช่ปุ่ม แค่แสดงข้อมูล)
  2. เส้นคั่น
  3. "จัดการบัญชี" → ลิงก์ไป `/account`
  4. เส้นคั่น
  5. "ออกจากระบบ" (ย้ายมาจากปุ่มลอยเดิม ตอนนี้อยู่ใน dropdown ทั้งหมด)
  - ปิด dropdown อัตโนมัติเมื่อคลิกข้างนอก (click-outside pattern ผ่าน
    `useRef` + `mousedown` listener)
- `[Navbar.jsx]` เรียงลำดับไอคอนฝั่งขวาใหม่ตามที่ตกลงกันไว้:
  **♡ Wishlist → 🌙 Dark mode toggle → 👤 User menu**
  - ปุ่ม ♡ Wishlist โชว์ badge ตัวเลขจำนวนที่บันทึกไว้ (ไม่โชว์ badge ถ้า
    เป็น 0), คลิกไปหน้า `/wishlist` โดยตรง (ตัว `WishlistPage` เองมี
    `RequireAuth` guard คอย redirect ไป `/signin` ให้ถ้ายังไม่ login)
- `[index.css]` เพิ่ม `.navbar-icon-btn`, `.navbar-wishlist-btn`,
  `.navbar-badge`, `.navbar-user-menu`, `.navbar-dropdown`,
  `.navbar-dropdown-user`, `.navbar-dropdown-divider`,
  `.navbar-dropdown-item` — ลบ `.navbar-auth-email` เดิมที่ไม่ใช้แล้ว, ย้าย
  `margin-left: auto` จาก `.dark-toggle` ไปที่ `.navbar-wishlist-btn` แทน
  (ตัวแรกสุดของกลุ่มขวาใหม่ที่ต้องดันกลุ่มทั้งหมดชิดขอบ)
- `[index.css]` เพิ่ม `.wishlist-heart` (+ `.card-img-heart`,
  `.card-grid-heart`, `.card-list-heart`) สำหรับปุ่ม ♡ บนการ์ด,
  `.detail-wishlist-btn` สำหรับปุ่ม ♡ ใหญ่บน `DetailPage`, `.signin-switch`
  สำหรับลิงก์สลับหน้า sign-in/sign-up

### Context
 
งานรอบนี้เป็น Phase แรกของแผน Wishlist ที่ปรึกษากันไว้ (ดู
`recent_updates` ในบันทึกโปรเจกต์ข้อ 1) แต่ระหว่างวางแผนพบว่าระบบ auth
เดิมออกแบบมาเฉพาะ admin คนเดียว ไม่มี concept ของ "user ทั่วไป login" เลย
— เลยขยายงานเป็น 3 ส่วนคู่กัน (Public Sign-up → Navbar dropdown → Wishlist)
แทนที่จะทำ Wishlist เดี่ยวๆ ตามแผนเดิม เพราะ Wishlist พึ่ง public sign-up
อยู่ ไม่มีทางแยกทำได้จริงถ้ายังไม่เปิดให้ user ทั่วไปสมัครได้ก่อน
 
ฟีเจอร์ที่ยังไม่ทำในรอบนี้ (ตามที่คุยไว้ตอนวางแผน แต่ยังไม่ implement):
- `price_at_save` snapshot ราคา ณ ตอนบันทึก wishlist (optional, ต้องมี
  migration ใหม่เพิ่ม column)
- แจ้งเตือนนัดประมูล/ราคาเปลี่ยนสำหรับทรัพย์ใน wishlist (ผูกกับ
  `user_alerts` ที่มีอยู่แล้ว)
- Wishlist comparison (เทียบ 2-3 ทรัพย์ side-by-side)
- Export wishlist เป็น PDF/Excel
- Bulk-add จาก GIS Map (เลือกพื้นที่แล้วเพิ่มทั้งหมดเข้า wishlist ทีเดียว)

### Build
 
- ทดสอบ `npm run build` (vite) ผ่านไม่มี syntax/import error — commit
  ฐานที่ใช้อ้างอิงคือ `2d4d204` (2026-08-20)
 
---
 
## 2026.08.20-1
 
### Changed — AdminParcelsPage: Export JSON เปลี่ยนเป็น format เดียวกับหน้า Crawler
 
- `[AdminParcelsPage.jsx]` เดิมปุ่ม Export JSON export ข้อมูลระดับ `parcels`
  (id, provid, amph2, parcelno, lat/long, verify_status, tag,
  land_price_per_sqw) ซึ่งใช้ป้อนกลับเข้า `landsmaps_collector_local.py --file`
  ไม่ได้ตรงๆ เพราะ field ไม่ตรงรูปแบบที่ script ต้องการ — เปลี่ยนเป็น export
  **asset-shaped JSON แบบเดียวกับ modal "รายการใหม่"** ใน `AdminCrawlerPage.jsx`
  ทุกประการ (field set เดียวกัน คือ `NEW_ASSETS_FIELDS`, key `"assets"` เดียวกัน)
- `[AdminParcelsPage.jsx]` ตรรกะ export ใหม่ 3 ขั้น:
  1. ดึง `parcels` ทุกแถวที่ตรง filter ปัจจุบันจริง (ไม่ใช่แค่หน้าที่เห็น) — ใช้
     `buildParcelsQuery()` เดิม แบ่งหน้าด้วย `.range()`
  2. หา asset id ทั้งหมดที่ผูกกับ parcel เหล่านั้นผ่าน `asset_parcels` (dedupe
     ด้วย `Set` เผื่อ parcel เดียวผูกหลาย asset หรือหลาย parcel ผูก asset เดียวกัน)
  3. ดึง asset เต็มรูปแบบด้วย field set เดียวกับ `AdminCrawlerPage.jsx`
     (`NEW_ASSETS_FIELDS`) แล้วห่อเป็น payload เดียวกัน
- `[AdminParcelsPage.jsx]` ประโยชน์ที่ได้: filter หน้า "จัดการโฉนด" ด้วย
  `สถานะพิกัด = mismatch` แล้ว Export JSON เอาไปรันกับ
  `landsmaps_collector_local.py --file <ไฟล์>` ได้ทันที ใช้แก้ parcel ที่เคยได้
  `mismatch` ปลอมจากบั๊ก `rai`/`ngan` เป็น `None` (ดู `CHANGELOG_2026.08.20-1.md`
  ฝั่ง backend) โดยไม่ต้องรอ checkpoint ปกติ หรือรื้อ asset ทั้งหมดใหม่

### Changed — AdminCrawlerPage: ตาราง Crawler Runs แสดงทุกรอบแทนที่จะจำกัด 15 รอบล่าสุด
 
- `[AdminCrawlerPage.jsx]` query `crawler_runs` เอา `.limit(15)` ออก เปลี่ยนเป็น
  `.limit(1000)` (เพดานปลอดภัย กัน query โหลดข้อมูลไม่จำกัดถ้า run เยอะขึ้นเรื่อยๆ
  ในอนาคต)
- `[AdminCrawlerPage.jsx]` หัวข้อตารางเปลี่ยนจาก "Crawler Runs (15 รอบล่าสุด)"
  แบบข้อความตายตัว เป็น "Crawler Runs (ทั้งหมด N รอบ)" คำนวณจำนวนจริงแบบ dynamic
  ทุกครั้งที่โหลดหน้า

### Context
 
งานสองอย่างนี้เป็นส่วนหนึ่งของการแก้บั๊ก mismatch ปลอมที่ไล่ตรวจจากรูป Table
Editor ของ Supabase (เห็น `rai`/`ngan` เป็น `NULL` จำนวนมากในตาราง `assets`) —
ฝั่ง frontend เตรียม tooling (export ที่ใช้ป้อน collector ได้ตรงๆ) ไว้รองรับ
การแก้ไขข้อมูลที่ค้างอยู่หลัง deploy โค้ด backend ที่แก้ไปแล้ว

---
 
## 2026.08.16-1
 
### Added — Admin: โครงสร้าง tab bar ใหม่ (Dashboard / Crawler / จัดการโฉนด)
 
- `[AdminLayout.jsx]` (ไฟล์ใหม่) — header + tab bar ของ `/admin` ใช้ nested route
  จริง (`/admin/dashboard`, `/admin/crawler`, `/admin/parcels`) แทน client-side
  tab state ตามที่เลือกไว้ — กด back/forward ของ browser ใช้งานได้ปกติ, refresh
  หน้าค้างที่ tab เดิมได้, แชร์ลิงก์ตรง tab ได้
- `[App.jsx]` เปลี่ยน route `/admin` จาก element เดี่ยวเป็น nested route ผ่าน
  `<AdminLayout>` ครอบด้วย `<RequireAdmin>` เหมือนเดิม (guard เดียวคุมทั้ง 3 tab
  ไม่ต้องเช็คสิทธิ์ซ้ำในแต่ละ tab)
  - `index` route เด้งไป `dashboard` โดย default
  - `/dashboard` เส้นทางเดิม → `<Navigate to="/admin/dashboard" replace />`
    (ตามที่ตกลงกันไว้ — ย้ายเนื้อหาเข้า tab แล้ว เลิกใช้หน้าเดี่ยวเดิม)

### Changed — แยกไฟล์หน้า Admin เดิมเป็น 3 ไฟล์ตาม tab
 
- `[AdminDashboardPage.jsx]` (ไฟล์ใหม่) — ย้ายเนื้อหาทั้งหมดจาก `DashboardPage.jsx`
  เดิมมาแบบ 1:1 (แค่เปลี่ยนชื่อ component) ไม่มี logic เปลี่ยน
- `[AdminCrawlerPage.jsx]` (ไฟล์ใหม่) — ย้ายเนื้อหาทั้งหมดจาก `AdminPage.jsx` เดิม
  (สถิติระบบ, LED Crawler, LandsMaps Session, Crawler Runs, modal "รายการใหม่"
  พร้อม Export JSON/พิกัด/sub-row ขยายดูรายแปลง) มาแบบ 1:1 — ตัดแค่ header
  "Admin Panel" ซ้ำออก เพราะ `AdminLayout` render ให้ทีเดียวครอบทุก tab แล้ว
  ไม่มี logic ไหนเปลี่ยน
- `[pages]` ลบ `AdminPage.jsx` และ `DashboardPage.jsx` เดิมทิ้ง (เนื้อหาย้ายออก
  ไปหมดแล้ว ไม่มีไฟล์ไหนอ้างอิงถึงอีก)

### Added — หน้าใหม่ "จัดการโฉนด" (`AdminParcelsPage.jsx`)
 
- ตาราง `parcels` join asset ตัวแทนต่อแถว (เลขที่ทรัพย์/จังหวัด/อำเภอ-ตำบล/
  ประเภท/ราคาประเมิน) — query 2 ขั้น: หา asset id ที่ตรง filter ก่อน (ถ้ามี filter
  ฝั่ง assets) → filter `parcels` ผ่าน `asset_parcels!inner(asset_id)` — mirror
  pattern เดียวกับที่ modal "รายการใหม่" ใน `AdminCrawlerPage.jsx` ใช้ดึงพิกัดอยู่
  แล้ว (พิสูจน์แล้วว่าใช้งานได้จริงในโปรเจกต์นี้)
- Filter: จังหวัด (จาก `PROVINCES` ใน `constants.js`), สถานะพิกัด (รวมตัวเลือก
  "ยังไม่มีพิกัด" ที่เช็ค `latitude is null` โดยเฉพาะ), มี/ไม่มี tag, ค้นหาเลขโฉนด
  (`ilike` บน `parcelno`), ค้นหาเลขที่ทรัพย์ LED (`ilike` บน `str_bid_num`), ช่วง
  วันที่ (จาก `assets.created_at` — ตามที่ขอไว้ตอนวางแผน "จะได้ export json เฉพาะ
  รายการในช่วงวันที่ filter ได้ด้วย")
- แก้ไขแบบ inline ต่อแถว — กด "แก้ไข" → lat/long/tag กลายเป็น input ในแถวนั้นเลย
  ไม่เปิด modal ซ้อน (มีแค่ 3 field ไม่ซับซ้อนพอที่จะต้องแยกหน้า):
  - `isPlausibleThaiLatLng()` เช็คคร่าวๆ ว่า lat/long อยู่ในกรอบพิกัดของไทย
    (lat 5–21, long 97–106) ก่อน save กันพิมพ์ผิด แต่ไม่ hard-block เผื่อ edge case
  - บันทึกแล้ว set `verify_status='manual'` อัตโนมัติเมื่อกรอกทั้ง lat และ long
    (ตามที่ตกลงกันไว้ก่อนเริ่มทำหน้านี้ — กัน `landsmaps_collector` รอบหน้ามารันทับ
    ดู migration `0014` + `is_retryable()` ฝั่ง backend ที่ข้าม status นี้แล้ว)
  - ลบพิกัดออกได้ (เว้นว่างทั้งคู่) โดยไม่บังคับ `verify_status='manual'`
- ปุ่ม "⬇ Export JSON (ตาม filter)" — export ทุกแถวที่ตรง filter ปัจจุบันจริง
  (ไม่ใช่แค่หน้าที่เห็น) แบ่งหน้าด้วย `.range()` เหมือน export เดิมใน
  `AdminCrawlerPage.jsx`, ไฟล์ที่ได้มี `filters` ที่ใช้ ณ ตอน export แนบไว้ด้วย
  เพื่อ traceability
- Pagination 50 แถว/หน้า พร้อมปุ่มก่อนหน้า/ถัดไป และเลขหน้า/จำนวนหน้ารวม
- asset ที่ query มา limit ไว้ที่ 3,000 รายการต่อครั้ง (ป้องกัน `.in()` ยาวเกินตอน
  filter กว้างเกินไป) — ขึ้น alert เตือนให้แคบ filter ลงถ้าชนเพดานนี้

### Changed — Navbar.jsx
 
- `[Navbar.jsx]` เอาลิงก์ "Dashboard" ออกจาก nav bar หลัก (ย้ายเข้าไปเป็น tab ใน
  `/admin` แล้ว)
- `[Navbar.jsx]` ลิงก์ "Admin" โชว์เฉพาะ user ที่ login แล้วและมี `role='admin'`
  เท่านั้น (`isAdmin === true`) — guest หรือ user ทั่วไปที่ยังไม่ login (หรือ
  login แล้วแต่ role ไม่ใช่ admin) จะไม่เห็นลิงก์นี้เลย ตามที่ขอไว้ก่อนเริ่มทำ

### Changed — index.css
 
- `[index.css]` `.admin-wrap` ปรับ padding จาก `24px 20px 40px` เหลือ `0 0 40px`
  (side/top padding ย้ายไปอยู่ที่ `.admin-shell` แทน กันเกิด padding ซ้อนสองชั้น
  ตอน `.admin-wrap` ถูก render ซ้อนอยู่ใน `.admin-shell` ของ `AdminLayout`)
- `[index.css]` เพิ่ม `.admin-wrap-wide` (max-width 1880px) — ใช้กับหน้าที่ตาราง
  กว้างกว่าปกติ (`AdminParcelsPage`) แทน `.admin-wrap` เดิม (920px) ที่แคบเกินสำหรับ
  ตารางหลายคอลัมน์
- `[index.css]` เพิ่ม `.admin-shell` / `.admin-shell-hd` / `.admin-tabs` /
  `.admin-tab` (+ `.active`) — style ของ header และ tab bar ใหม่ทั้งชุด
- `[index.css]` เพิ่ม `.parcels-filter-grid` / `.pf-field` / `.pf-inline-input` /
  `.parcel-row-editing` — style ของ filter bar และ inline-edit ในหน้าจัดการโฉนด
- `[index.css]` เพิ่ม `.parcel-status` + variant สีตาม `verify_status`
  (`matched`/`partial_match` เขียว, `manual` ฟ้า accent, `not_verified`/`mismatch`
  เหลือง, `not_found`/`error` แดง) — badge สถานะพิกัดในตาราง

---

## 2026.08.15-1

### Changed — DetailPage: Layout ราคากรอบ 2 เป็นแนวตั้ง + ลบ label กรอบ 1

**บริบท:** กรอบ 2 (ราคาประเมิน 4 แหล่ง) ใช้ layout แนวนอนเดิม (label ซ้าย-ราคาขวา
บรรทัดเดียว) ทำให้ label ยาวอย่าง "(เจ้าพนักงานประเมินราคาทรัพย์)" บีบพื้นที่ราคาจนตัว
เลขหลักเยอะ (เช่น `1,836,040 ฿`) ขึ้นบรรทัดใหม่ไม่สม่ำเสมอ

#### DetailPage.jsx

- `[DetailPage]` กรอบ 1 (ราคาเริ่มประมูล) — ลบ label วงเล็บบอกแหล่งที่มา
  (`{startPriceLabel}`) ออก เหลือแค่ **"💰 ราคาเริ่มประมูล"** เฉยๆ ตาม
  layout row เดิม (ไม่เปลี่ยนตามกรอบ 2)
- `[DetailPage]` กรอบ 2 (ราคาประเมิน 4 แหล่ง) — เปลี่ยนทุกแถวจาก class `.price-row`
  เป็น **`.price-row-v2`** (column layout)
  - Label เต็มความกว้าง บรรทัดบน อยู่ในบรรทัดเดียว (รวมวงเล็บแหล่งที่มา ไม่ต้องแยก
    `<br/>` อีกต่อไป เพราะมีที่พอแล้ว)
  - ราคาอยู่บรรทัดล่าง ชิดขวา (`align-self: flex-end`) ไม่มีปัญหาตัดบรรทัดอีก
  - ใช้กับทั้ง 4 ราคา: assetprice2/3/4/5 และราคาที่ดินกรมที่ดิน (LandsMaps)

#### index.css

- `[css]` เพิ่ม `.price-row-v2` — `flex-direction: column; gap: 3px`
  `.price-row-v2 .lbl` label ปกติ, `.price-row-v2 .val` `align-self: flex-end`
  font-family mono ตัวหนา
- `[css]` `.price-row` (กรอบ 1) ไม่แตะ — ยังเป็น row layout เดิม

---

### Added — Lightbox: ปุ่มหมุนรูป 90°

**บริบท:** รูปภาพทรัพย์บางรูปที่ crawl มาจาก LED หันด้านกลับ (แนวนอน/แนวตั้งผิด)
ผู้ใช้ต้องการหมุนดูให้ถูกทิศโดยไม่ต้องออกจาก lightbox

#### DetailPage.jsx

- `[Lightbox]` เพิ่ม state `rotation` (0/90/180/270) เก็บใน component เอง
  reset กลับ 0 ทุกครั้งที่เปิดรูปใหม่ (unmount/remount ของ Lightbox)
- `[Lightbox]` เพิ่มปุ่ม 🔄 มุมขวาบนของ overlay (ข้างปุ่มปิด ✕)
  กดแต่ละครั้งหมุนเพิ่ม 90° วนลูป (`(r + 90) % 360`)
- `[Lightbox]` รูปภาพใช้ `style={{ transform: rotate(${rotation}deg) }}`
  พร้อม CSS `transition: transform 0.25s ease` ให้หมุนนุ่มนวล ไม่กระตุก

#### index.css

- `[css]` เพิ่ม `.lightbox-rotate` — ปุ่มกลม 36px วางถัดจาก `.lightbox-close`
  (offset `right: 68px`) สไตล์เดียวกับปุ่มปิด (glass button บนพื้นดำ)
- `[css]` เพิ่ม `.lightbox-img { transition: transform 0.25s ease }`

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
