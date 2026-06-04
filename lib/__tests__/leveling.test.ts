import { describe, it, expect } from "vitest"
import { userLevelForXp, xpForLevel, levelProgress, dailyGoalForLevel } from "@/lib/leveling"

describe("userLevelForXp", () => {
  it("is level 1 at 0 and below the first threshold", () => {
    expect(userLevelForXp(0)).toBe(1)
    expect(userLevelForXp(99)).toBe(1)
  })
  it("crosses to level 2 at exactly 100 XP", () => {
    expect(userLevelForXp(100)).toBe(2)
    expect(userLevelForXp(299)).toBe(2)
  })
  it("crosses to level 3 at 300 and level 4 at 600", () => {
    expect(userLevelForXp(300)).toBe(3)
    expect(userLevelForXp(599)).toBe(3)
    expect(userLevelForXp(600)).toBe(4)
  })
  it("never returns below 1 for negative input", () => {
    expect(userLevelForXp(-50)).toBe(1)
  })
})

describe("xpForLevel", () => {
  it("returns cumulative XP needed to reach a level", () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(xpForLevel(4)).toBe(600)
  })
})

describe("levelProgress", () => {
  it("reports progress within the current level", () => {
    const p = levelProgress(150)
    expect(p.level).toBe(2)
    expect(p.into).toBe(50)
    expect(p.needed).toBe(200)
    expect(p.pct).toBe(25)
  })
  it("is 0% at the start of a level", () => {
    expect(levelProgress(100).pct).toBe(0)
  })
})

describe("dailyGoalForLevel", () => {
  it("grows with level and caps at 150", () => {
    expect(dailyGoalForLevel(1)).toBe(50)
    expect(dailyGoalForLevel(3)).toBe(70)
    expect(dailyGoalForLevel(11)).toBe(150)
    expect(dailyGoalForLevel(20)).toBe(150)
  })
})
