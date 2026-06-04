// User-level progression. Level is derived from total XP and never stored.
// Escalating curve: level N -> N+1 costs 100 * N XP.
// Cumulative XP to reach level L = 50 * L * (L - 1).

export function userLevelForXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  return Math.floor((50 + Math.sqrt(2500 + 200 * totalXp)) / 100)
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return 50 * level * (level - 1)
}

export function levelProgress(totalXp: number): {
  level: number
  into: number
  needed: number
  pct: number
} {
  const level = userLevelForXp(totalXp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const into = totalXp - base
  const needed = next - base
  const pct = needed > 0 ? Math.min(100, Math.max(0, Math.round((into / needed) * 100))) : 0
  return { level, into, needed, pct }
}

export function dailyGoalForLevel(level: number): number {
  return Math.min(40 + 10 * level, 150)
}
