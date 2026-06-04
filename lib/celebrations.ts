import type { Character } from "./types"
import { userLevelForXp } from "./leveling"

export type CelebrationKind = "streak" | "bond" | "character-level" | "daily-goal" | "user-level"

export interface Celebration {
  kind: CelebrationKind
  character?: Character
  level?: number
  streak?: number
  xpGained: number
}

export interface CompletionResult {
  xpGained: number
  oldTotalXp: number
  newTotalXp: number
  oldStreak: number
  newStreak: number
  oldXpToday: number
  newXpToday: number
  dailyGoal: number
  /** Character used for events that aren't tied to a specific companion. */
  focusCharacter?: Character
  characterLevelUps: { character: Character; level: number }[]
  bondLevelUps: { character: Character; level: number }[]
}

export const STREAK_MILESTONES = [3, 7, 14, 30]

// Smallest -> biggest, so a multi-celebration sequence climaxes on the user level-up.
const ORDER: CelebrationKind[] = ["streak", "bond", "character-level", "daily-goal", "user-level"]

export function buildCelebrations(r: CompletionResult): Celebration[] {
  const out: Celebration[] = []

  const crossedStreak = STREAK_MILESTONES.find((m) => r.oldStreak < m && r.newStreak >= m)
  if (crossedStreak) {
    out.push({ kind: "streak", streak: crossedStreak, character: r.focusCharacter, xpGained: r.xpGained })
  }

  for (const b of r.bondLevelUps) {
    out.push({ kind: "bond", character: b.character, level: b.level, xpGained: r.xpGained })
  }

  for (const c of r.characterLevelUps) {
    out.push({ kind: "character-level", character: c.character, level: c.level, xpGained: r.xpGained })
  }

  if (r.oldXpToday < r.dailyGoal && r.newXpToday >= r.dailyGoal) {
    out.push({ kind: "daily-goal", character: r.focusCharacter, xpGained: r.xpGained })
  }

  const oldLevel = userLevelForXp(r.oldTotalXp)
  const newLevel = userLevelForXp(r.newTotalXp)
  if (newLevel > oldLevel) {
    out.push({ kind: "user-level", level: newLevel, character: r.focusCharacter, xpGained: r.xpGained })
  }

  return out.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
}
