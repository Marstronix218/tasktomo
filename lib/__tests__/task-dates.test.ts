import { describe, expect, it } from "vitest"
import { isTodoShownOnDate } from "../task-dates"
import type { Todo } from "../types"

const TODAY = "2026-07-14"
const TOMORROW = "2026-07-15"

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    text: "Test task",
    completed: false,
    xp: 10,
    category: "General",
    difficulty: "Easy",
    ...overrides,
  }
}

describe("isTodoShownOnDate", () => {
  it("includes undated and exactly due tasks in today's view", () => {
    expect(isTodoShownOnDate(makeTodo(), TODAY, TODAY)).toBe(true)
    expect(isTodoShownOnDate(makeTodo({ dueDate: TODAY }), TODAY, TODAY)).toBe(true)
  })

  it("includes overdue pending tasks but excludes overdue completed tasks from today", () => {
    expect(isTodoShownOnDate(makeTodo({ dueDate: "2026-07-13" }), TODAY, TODAY)).toBe(true)
    expect(isTodoShownOnDate(makeTodo({ dueDate: "2026-07-13", completed: true }), TODAY, TODAY)).toBe(false)
  })

  it("excludes future tasks from today's view", () => {
    expect(isTodoShownOnDate(makeTodo({ dueDate: TOMORROW }), TODAY, TODAY)).toBe(false)
  })

  it("includes only tasks exactly due in a future-day view", () => {
    expect(isTodoShownOnDate(makeTodo({ dueDate: TOMORROW }), TOMORROW, TODAY)).toBe(true)
    expect(isTodoShownOnDate(makeTodo(), TOMORROW, TODAY)).toBe(false)
    expect(isTodoShownOnDate(makeTodo({ dueDate: TODAY }), TOMORROW, TODAY)).toBe(false)
    expect(isTodoShownOnDate(makeTodo({ dueDate: "2026-07-16" }), TOMORROW, TODAY)).toBe(false)
  })
})
