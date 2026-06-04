import type { Todo } from "./types"
import { addDaysIso } from "./date-utils"

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Monday (UTC) of the week containing refIso (yyyy-mm-dd). */
export function weekStartIso(refIso: string): string {
  const d = new Date(refIso + "T00:00:00Z")
  const dow = d.getUTCDay() // 0=Sun .. 6=Sat
  const offsetToMonday = (dow + 6) % 7
  return addDaysIso(refIso, -offsetToMonday)
}

/** The seven ISO day strings starting at weekStart. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i))
}

function byOrder(a: Todo, b: Todo): number {
  return (a.order ?? 0) - (b.order ?? 0)
}

/** Map of dayIso -> tasks scheduled that day (within the week), each sorted by order. */
export function groupTodosForWeek(todos: Todo[], weekStart: string): Record<string, Todo[]> {
  const days = weekDays(weekStart)
  const out: Record<string, Todo[]> = {}
  for (const d of days) out[d] = []
  for (const t of todos) {
    if (t.scheduledDate && out[t.scheduledDate]) out[t.scheduledDate].push(t)
  }
  for (const d of days) out[d].sort(byOrder)
  return out
}

/** Unscheduled = no scheduledDate. Overdue = incomplete and scheduled before today. */
export function partitionUnscheduledOverdue(
  todos: Todo[],
  todayIso: string,
): { unscheduled: Todo[]; overdue: Todo[] } {
  const unscheduled: Todo[] = []
  const overdue: Todo[] = []
  for (const t of todos) {
    if (!t.scheduledDate) unscheduled.push(t)
    else if (!t.completed && t.scheduledDate < todayIso) overdue.push(t)
  }
  unscheduled.sort(byOrder)
  overdue.sort((a, b) => (a.scheduledDate! < b.scheduledDate! ? -1 : a.scheduledDate! > b.scheduledDate! ? 1 : 0))
  return { unscheduled, overdue }
}

/**
 * Move `taskId` into a day (dayIso) or the unscheduled bucket (dayIso === null) at `toIndex`,
 * reassigning sequential `order` to every task in the destination group. Returns new todos.
 * Handles both cross-day moves and within-day reordering.
 */
export function moveToDay(todos: Todo[], taskId: number, dayIso: string | null, toIndex: number): Todo[] {
  const moving = todos.find((t) => t.id === taskId)
  if (!moving) return todos
  const inDest = (t: Todo) => (dayIso === null ? !t.scheduledDate : t.scheduledDate === dayIso)

  const dest = todos.filter((t) => t.id !== taskId && inDest(t)).sort(byOrder)
  const clamped = Math.max(0, Math.min(toIndex, dest.length))
  dest.splice(clamped, 0, moving)

  const orderById = new Map<number, number>()
  dest.forEach((t, i) => orderById.set(t.id, i))

  return todos.map((t) => {
    if (t.id === taskId) return { ...t, scheduledDate: dayIso ?? undefined, order: orderById.get(taskId)! }
    if (orderById.has(t.id)) return { ...t, order: orderById.get(t.id)! }
    return t
  })
}
