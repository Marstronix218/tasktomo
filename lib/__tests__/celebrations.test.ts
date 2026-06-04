import { describe, it, expect } from "vitest"
import { buildCelebrations, STREAK_MILESTONES, type CompletionResult } from "@/lib/celebrations"
import type { Character } from "@/lib/types"

const char = (id: number, name: string): Character => ({
  id, name, avatar: "", level: 1, personality: "", description: "",
  bondLevel: 0, maxBond: 10, prompt: "", xp: 0, tasksCompleted: 0,
})

const base = (over: Partial<CompletionResult> = {}): CompletionResult => ({
  xpGained: 10,
  oldTotalXp: 0,
  newTotalXp: 10,
  oldStreak: 1,
  newStreak: 1,
  oldXpToday: 0,
  newXpToday: 10,
  dailyGoal: 50,
  focusCharacter: char(1, "Nova"),
  characterLevelUps: [],
  bondLevelUps: [],
  ...over,
})

describe("buildCelebrations", () => {
  it("returns nothing for an ordinary completion", () => {
    expect(buildCelebrations(base())).toEqual([])
  })

  it("fires a streak celebration only when a milestone is crossed", () => {
    expect(buildCelebrations(base({ oldStreak: 2, newStreak: 3 })).map((c) => c.kind)).toEqual(["streak"])
    expect(buildCelebrations(base({ oldStreak: 3, newStreak: 4 }))).toEqual([])
  })

  it("fires a daily-goal celebration only on the crossing completion", () => {
    expect(buildCelebrations(base({ oldXpToday: 40, newXpToday: 60, dailyGoal: 50 })).map((c) => c.kind)).toEqual(["daily-goal"])
    expect(buildCelebrations(base({ oldXpToday: 60, newXpToday: 70, dailyGoal: 50 }))).toEqual([])
  })

  it("fires a user-level celebration when the user levels up", () => {
    const out = buildCelebrations(base({ oldTotalXp: 90, newTotalXp: 110 }))
    expect(out.map((c) => c.kind)).toEqual(["user-level"])
    expect(out[0].level).toBe(2)
  })

  it("emits one celebration per character/bond level-up", () => {
    const out = buildCelebrations(base({
      characterLevelUps: [{ character: char(1, "Nova"), level: 2 }],
      bondLevelUps: [{ character: char(2, "Rook"), level: 1 }],
    }))
    expect(out.map((c) => c.kind).sort()).toEqual(["bond", "character-level"])
  })

  it("orders multiple celebrations smallest -> biggest (climaxing on user-level)", () => {
    const out = buildCelebrations(base({
      oldStreak: 2, newStreak: 3,
      oldXpToday: 40, newXpToday: 120, dailyGoal: 50,
      oldTotalXp: 90, newTotalXp: 120,
      characterLevelUps: [{ character: char(1, "Nova"), level: 2 }],
      bondLevelUps: [{ character: char(1, "Nova"), level: 1 }],
    }))
    expect(out.map((c) => c.kind)).toEqual(["streak", "bond", "character-level", "daily-goal", "user-level"])
  })

  it("exposes the streak milestones", () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30])
  })
})
