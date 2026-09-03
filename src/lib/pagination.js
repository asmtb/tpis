/** คำนวณเลขหน้าที่จะโชว์ในปุ่ม pagination (มี "…" คั่นถ้าห่างกันเกิน) */
export function pageBtns(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const s = new Set([1, total, cur, cur - 1, cur + 1])
  const sorted = [...s].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  const out = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}
