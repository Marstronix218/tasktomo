import type { Todo } from "./types"

/**
 * Returns whether a task belongs in the selected ISO-day view.
 *
 * The today view also surfaces undated work and unfinished overdue work. Other
 * day views contain only tasks explicitly due on that day.
 */
export function isTodoShownOnDate(todo: Todo, shownDate: string, todayDate: string): boolean {
  if (shownDate !== todayDate) return todo.dueDate === shownDate

  if (!todo.dueDate || todo.dueDate === todayDate) return true

  return todo.dueDate < todayDate && !todo.completed
}
