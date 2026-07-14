import { describe, expect, it } from "vitest"
import { tasksToTodos, todosToTaskData } from "../profile-mapping"
import type { Todo } from "../types"

describe("task mapping roundtrip", () => {
  const todo: Todo = {
    id: 1721900000000,
    text: "Prep slides for standup",
    completed: false,
    xp: 10,
    category: "Work",
    difficulty: "Easy",
    assignedCharacterId: 2,
    recurrence: "none",
    dueDate: "2026-07-15",
    createdAt: "2026-07-14T21:10:00.000Z",
    createdVia: "nudge",
  }

  it("persists createdVia through TaskData and back", () => {
    const [data] = todosToTaskData([todo])
    expect(data.created_via).toBe("nudge")
    const [back] = tasksToTodos([data])
    expect(back.createdVia).toBe("nudge")
    expect(back.text).toBe(todo.text)
    expect(back.createdAt).toBe(todo.createdAt)
  })

  it("leaves createdVia undefined for organic tasks", () => {
    const [data] = todosToTaskData([{ ...todo, createdVia: undefined }])
    expect(data.created_via).toBeUndefined()
    const [back] = tasksToTodos([data])
    expect(back.createdVia).toBeUndefined()
  })

  it("persists dueDate through TaskData and back", () => {
    const [data] = todosToTaskData([todo])
    expect(data.due_date).toBe("2026-07-15")
    const [back] = tasksToTodos([data])
    expect(back.dueDate).toBe(todo.dueDate)
  })

  it("leaves dueDate undefined for legacy tasks", () => {
    const [data] = todosToTaskData([{ ...todo, dueDate: undefined }])
    expect(data.due_date).toBeUndefined()
    const [back] = tasksToTodos([data])
    expect(back.dueDate).toBeUndefined()
  })
})
