const CHIPS = [
  { id: 'hot',    emoji: '🔥', label: 'Hot Deal',   filter: { price_max: '3000000' } },
  { id: 'house',  emoji: '🏠', label: 'บ้าน/อาคาร', filter: { asset_type_id: '003' } },
  { id: 'land',   emoji: '🌾', label: 'ที่ดิน',     filter: { asset_type_id: '001' } },
  { id: 'condo',  emoji: '🏢', label: 'ห้องชุด',    filter: { asset_type_id: '002' } },
  { id: 'open',   emoji: '📅', label: 'เปิดประมูล', filter: { status: 'open' } },
  { id: 'closed', emoji: '✅', label: 'ปิดแล้ว',    filter: { status: 'closed' } },
]

export default function FilterChips({ activeChip, onChip }) {
  const handleClick = (chip) => {
    // toggle: กด chip เดิมซ้ำ = ยกเลิก
    onChip(activeChip === chip.id ? null : chip)
  }

  return (
    <div className="filter-chips">
      <span className="filter-chips-label">Quick</span>
      {CHIPS.map(c => (
        <button
          key={c.id}
          className={`chip${c.id === 'hot' ? ' c-orange' : ''}${activeChip === c.id ? ' active' : ''}`}
          onClick={() => handleClick(c)}
        >
          <span>{c.emoji}</span>
          {c.label}
        </button>
      ))}
    </div>
  )
}
