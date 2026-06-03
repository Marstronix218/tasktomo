export function todayIso(d = new Date()): string {
  return d.toISOString().slice(0, 10)
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
