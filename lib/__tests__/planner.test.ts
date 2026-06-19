import { describe, it, expect } from "vitest"
import { weekStartIso, weekDays, groupTodosForWeek, partitionUnscheduledOverdue, moveToDay } from "@/lib/planner"
import type { Todo } from "@/lib/types"

const t = (id: number, over: Partial<Todo> = {}): Todo => ({
  id, text: `t${id}`, completed: false, xp: 10, category: "General", difficulty: "Easy", ...over,
})

describe("weekStartIso", () => {
  it("returns the Monday of the week (UTC)", () => {
    expect(weekStartIso("2026-06-04")).toBe("2026-06-01") // Thu -> Mon
    expect(weekStartIso("2026-06-01")).toBe("2026-06-01") // Mon -> Mon
    expect(weekStartIso("2026-06-07")).toBe("2026-06-01") // Sun -> Mon
  })
})

describe("weekDays", () => {
  it("returns seven consecutive ISO days from the start", () => {
    expect(weekDays("2026-06-01")).toEqual([
      "2026-06-01","2026-06-02","2026-06-03","2026-06-04","2026-06-05","2026-06-06","2026-06-07",
    ])
  })
})

describe("groupTodosForWeek", () => {
  it("buckets tasks by scheduledDate, sorted by order, ignoring out-of-week tasks", () => {
    const todos = [
      t(1, { scheduledDate: "2026-06-01", order: 1 }),
      t(2, { scheduledDate: "2026-06-01", order: 0 }),
      t(3, { scheduledDate: "2026-05-30", order: 0 }), // out of week
      t(4, { scheduledDate: undefined }),
    ]
    const g = groupTodosForWeek(todos, "2026-06-01")
    expect(g["2026-06-01"].map((x) => x.id)).toEqual([2, 1])
    expect(g["2026-06-02"]).toEqual([])
  })
})

describe("partitionUnscheduledOverdue", () => {
  it("splits unscheduled and overdue (incomplete, before today)", () => {
    const todos = [
      t(1, { scheduledDate: undefined }),
      t(2, { scheduledDate: "2026-06-01" }),              // overdue
      t(3, { scheduledDate: "2026-06-01", completed: true }), // not overdue (done)
      t(4, { scheduledDate: "2026-06-10" }),              // future
    ]
    const { unscheduled, overdue } = partitionUnscheduledOverdue(todos, "2026-06-04")
    expect(unscheduled.map((x) => x.id)).toEqual([1])
    expect(overdue.map((x) => x.id)).toEqual([2])
  })
})

describe("moveToDay", () => {
  it("moves a task to a day and assigns sequential order in the destination", () => {
    const todos = [
      t(1, { scheduledDate: "2026-06-02", order: 0 }),
      t(2, { scheduledDate: "2026-06-02", order: 1 }),
      t(3, { scheduledDate: undefined }),
    ]
    const next = moveToDay(todos, 3, "2026-06-02", 1)
    const day = next.filter((x) => x.scheduledDate === "2026-06-02").sort((a, b) => (a.order! - b.order!))
    expect(day.map((x) => x.id)).toEqual([1, 3, 2])
    expect(day.map((x) => x.order)).toEqual([0, 1, 2])
  })

  it("clears scheduledDate when moved to the unscheduled bucket (null)", () => {
    const todos = [t(1, { scheduledDate: "2026-06-02", order: 0 })]
    const next = moveToDay(todos, 1, null, 0)
    expect(next[0].scheduledDate).toBeUndefined()
    expect(next[0].order).toBe(0)
  })

  it("reorders within the same day", () => {
    const todos = [
      t(1, { scheduledDate: "2026-06-02", order: 0 }),
      t(2, { scheduledDate: "2026-06-02", order: 1 }),
      t(3, { scheduledDate: "2026-06-02", order: 2 }),
    ]
    const next = moveToDay(todos, 1, "2026-06-02", 2)
    const day = next.filter((x) => x.scheduledDate === "2026-06-02").sort((a, b) => (a.order! - b.order!))
    expect(day.map((x) => x.id)).toEqual([2, 3, 1])
  })
})
