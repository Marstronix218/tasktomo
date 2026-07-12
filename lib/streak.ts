import { addDaysIso, diffDaysIso } from "./date-utils"

// Streak is keyed to *completion* days: it grows the first time the user
// completes something on a day, chains when that day is adjacent to the
// previous completion day, and breaks otherwise. Logins alone never grow
// or preserve a streak.

export interface RolloverResult {
  streakCount: number
  streakFreezes: number
  lastCompletionDate: string | null
  freezeUsed: boolean
  streakReset: boolean
}

/**
 * New streak value after completing something on `today`, or null when the
 * streak must not change (a completion was already counted today).
 */
export function streakAfterCompletion(
  streakCount: number,
  lastCompletionDate: string | null,
  today: string,
): number | null {
  if (lastCompletionDate === today) return null
  const continues = lastCompletionDate !== null && diffDaysIso(today, lastCompletionDate) === 1
  return continues ? streakCount + 1 : 1
}

/**
 * Day-rollover bookkeeping: when at least one full day passed with no
 * completion, burn a Streak Freeze (keeps the chain alive) or reset.
 */
export function rolloverStreak(params: {
  streakCount: number
  streakFreezes: number
  lastCompletionDate: string | null
  today: string
}): RolloverResult {
  const { streakCount, streakFreezes, lastCompletionDate, today } = params
  const result: RolloverResult = {
    streakCount,
    streakFreezes,
    lastCompletionDate,
    freezeUsed: false,
    streakReset: false,
  }
  if (streakCount <= 0) return result
  const missedDay = lastCompletionDate === null || diffDaysIso(today, lastCompletionDate) > 1
  if (!missedDay) return result
  if (streakFreezes > 0) {
    result.streakFreezes = streakFreezes - 1
    result.freezeUsed = true
    // Count yesterday as covered so today's first completion continues the chain.
    result.lastCompletionDate = addDaysIso(today, -1)
  } else {
    result.streakCount = 0
    result.streakReset = true
  }
  return result
}
