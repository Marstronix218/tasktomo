import { describe, it, expect } from "vitest"
import { todosToTaskData, tasksToTodos } from "@/lib/profile-mapping"
import type { Todo } from "@/lib/types"

const todo: Todo = {
  id: 42,
  text: "Write methods section",
  completed: false,
  xp: 20,
  category: "Study",
  difficulty: "Medium",
  assignedCharacterId: 1,
  recurrence: "none",
  scheduledDate: "2026-06-04",
  order: 3,
  createdAt: "2026-06-01T00:00:00.000Z",
}

describe("profile-mapping scheduling fields", () => {
  it("round-trips scheduledDate and order through TaskData", () => {
    const [stored] = todosToTaskData([todo])
    expect(stored.scheduled_date).toBe("2026-06-04")
    expect(stored.order).toBe(3)

    const [back] = tasksToTodos([stored])
    expect(back.scheduledDate).toBe("2026-06-04")
    expect(back.order).toBe(3)
  })

  it("leaves scheduledDate undefined for unscheduled tasks", () => {
    const [stored] = todosToTaskData([{ ...todo, scheduledDate: undefined, order: undefined }])
    expect(stored.scheduled_date).toBeUndefined()
    const [back] = tasksToTodos([stored])
    expect(back.scheduledDate).toBeUndefined()
  })
})
