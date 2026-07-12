// Local calendar day, not UTC — the streak/quest "day" must flip at the
// user's midnight (hoursLeftInDay below is local too).
export function todayIso(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Coerce stored date strings (including legacy `toDateString()` values) to YYYY-MM-DD. */
export function normalizeIsoDate(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : todayIso(d)
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDaysIso(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime()
  const db = new Date(b + "T00:00:00Z").getTime()
  return Math.round((da - db) / (1000 * 60 * 60 * 24))
}

export function hoursLeftInDay(d = new Date()): number {
  const endOfDay = new Date(d)
  endOfDay.setHours(24, 0, 0, 0)
  return Math.max(0, (endOfDay.getTime() - d.getTime()) / (1000 * 60 * 60))
}
