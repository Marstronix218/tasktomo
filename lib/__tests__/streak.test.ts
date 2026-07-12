import { describe, it, expect } from "vitest"
import { streakAfterCompletion, rolloverStreak } from "@/lib/streak"

describe("streakAfterCompletion", () => {
  it("starts at 1 for a brand-new user with no completion history", () => {
    expect(streakAfterCompletion(0, null, "2026-07-12")).toBe(1)
  })

  it("does not grow twice on the same day (regression: focus sessions inflated streak)", () => {
    expect(streakAfterCompletion(1, "2026-07-12", "2026-07-12")).toBeNull()
    expect(streakAfterCompletion(7, "2026-07-12", "2026-07-12")).toBeNull()
  })

  it("continues the chain when the previous completion was yesterday", () => {
    expect(streakAfterCompletion(3, "2026-07-11", "2026-07-12")).toBe(4)
  })

  it("restarts at 1 after a missed day, even with a large old streak", () => {
    expect(streakAfterCompletion(15, "2026-07-09", "2026-07-12")).toBe(1)
  })

  it("crosses month boundaries correctly", () => {
    expect(streakAfterCompletion(2, "2026-06-30", "2026-07-01")).toBe(3)
  })
})

describe("rolloverStreak", () => {
  it("does nothing when there is no streak (new users never lose freezes)", () => {
    const r = rolloverStreak({ streakCount: 0, streakFreezes: 1, lastCompletionDate: null, today: "2026-07-12" })
    expect(r).toMatchObject({ streakCount: 0, streakFreezes: 1, freezeUsed: false, streakReset: false })
  })

  it("keeps the streak untouched when the last completion was yesterday", () => {
    const r = rolloverStreak({ streakCount: 4, streakFreezes: 1, lastCompletionDate: "2026-07-11", today: "2026-07-12" })
    expect(r).toMatchObject({ streakCount: 4, streakFreezes: 1, freezeUsed: false, streakReset: false })
  })

  it("keeps the streak untouched when something was already completed today", () => {
    const r = rolloverStreak({ streakCount: 4, streakFreezes: 1, lastCompletionDate: "2026-07-12", today: "2026-07-12" })
    expect(r.freezeUsed).toBe(false)
    expect(r.streakReset).toBe(false)
  })

  it("burns a freeze instead of resetting after a missed day", () => {
    const r = rolloverStreak({ streakCount: 4, streakFreezes: 2, lastCompletionDate: "2026-07-10", today: "2026-07-12" })
    expect(r.freezeUsed).toBe(true)
    expect(r.streakFreezes).toBe(1)
    expect(r.streakCount).toBe(4)
    // Yesterday counts as covered so today's first completion continues the chain.
    expect(r.lastCompletionDate).toBe("2026-07-11")
  })

  it("resets the streak when no freezes are left", () => {
    const r = rolloverStreak({ streakCount: 9, streakFreezes: 0, lastCompletionDate: "2026-07-08", today: "2026-07-12" })
    expect(r.streakReset).toBe(true)
    expect(r.streakCount).toBe(0)
  })

  it("resets an orphaned streak with unknown completion history and no freezes", () => {
    const r = rolloverStreak({ streakCount: 3, streakFreezes: 0, lastCompletionDate: null, today: "2026-07-12" })
    expect(r.streakReset).toBe(true)
    expect(r.streakCount).toBe(0)
  })
})
