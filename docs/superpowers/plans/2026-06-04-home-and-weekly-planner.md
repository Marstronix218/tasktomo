# Home + Weekly Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the single dashboard into a companion-forward **Home** and a dedicated **Planner** (responsive weekly calendar with `@dnd-kit` drag-to-plan), sharing a per-task `scheduledDate`/`order` model, while reusing the existing completion/XP/celebration pipeline.

**Architecture:** Pure scheduling logic lives in `lib/planner.ts` (vitest-tested). Tasks gain `scheduledDate`/`order` (stored in the existing `tasks` JSON — no SQL migration); one new `active_companion_id` column backs the Home hero. `app/dashboard/page.tsx` stays the orchestrator (state, handlers, persistence, view routing) and delegates rendering to new `home-view` and `week-planner` component trees. Drag uses `@dnd-kit`; completion still flows through the existing `toggleTodo` → `handleTaskCompleted`.

**Tech Stack:** Next.js 15 / React 19 / TypeScript / Tailwind, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (new), `vitest` (already installed), Supabase.

**Spec:** [docs/superpowers/specs/2026-06-04-home-and-weekly-planner-design.md](../specs/2026-06-04-home-and-weekly-planner-design.md)

---

## File Structure

**New files**
- `lib/planner.ts` — pure scheduling helpers (week math, grouping, move/reorder).
- `lib/__tests__/planner.test.ts` — vitest tests.
- `lib/__tests__/profile-mapping.test.ts` — round-trip test for the new task fields.
- `components/stat-card.tsx` — the `Stat` card extracted from `page.tsx` so Home can reuse it.
- `components/character-hero.tsx` — Home's active-companion hero + reserved animation zone.
- `components/task-editor.tsx` — add/edit task modal with a day picker (shared by Home + Planner).
- `components/planner-task-card.tsx` — a draggable/sortable task card.
- `components/planner-day.tsx` — a droppable day/bucket column holding sortable cards.
- `components/week-planner.tsx` — the Planner view (DnD context, week nav, grid/agenda, buckets).
- `components/home-view.tsx` — the Home view (metrics strip, hero, today list, quests, streak banner, chat launcher).

**Modified files**
- `lib/types.ts` — `Todo` gains `scheduledDate?`, `order?`.
- `lib/supabase.ts` — `TaskData` gains `scheduled_date?`, `order?`; `UserProfile` gains `active_companion_id?`.
- `lib/profile-mapping.ts` — map the new task fields both ways.
- `supabase/schema.sql` — idempotent `active_companion_id` column.
- `app/dashboard/page.tsx` — extract `Stat`; add scheduling state/handlers; swap view-switcher to `home`/`planner`; render the new views.

---

## Task 1: Install @dnd-kit

**Files:** `package.json`

- [ ] **Step 1: Install**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities --legacy-peer-deps
```
Expected: installs succeed (`--legacy-peer-deps` is required per CLAUDE.md).

- [ ] **Step 2: Verify they resolve**

Run: `node -e "require.resolve('@dnd-kit/core'); require.resolve('@dnd-kit/sortable'); require.resolve('@dnd-kit/utilities'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for the weekly planner"
```

---

## Task 2: Task scheduling fields + mapping

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/supabase.ts` (`TaskData`)
- Modify: `lib/profile-mapping.ts`
- Test: `lib/__tests__/profile-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/profile-mapping.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- profile-mapping`
Expected: FAIL — `scheduled_date` is `undefined` (field not mapped yet).

- [ ] **Step 3: Add fields to `Todo`**

In `lib/types.ts`, inside `interface Todo`, after `recurrence?: "none" | "daily" | "weekly"`, add:
```ts
  scheduledDate?: string
  order?: number
```

- [ ] **Step 4: Add fields to `TaskData`**

In `lib/supabase.ts`, inside `interface TaskData`, after `assigned_character_id?: number`, add:
```ts
  scheduled_date?: string
  order?: number
```

- [ ] **Step 5: Map both ways in `profile-mapping.ts`**

In `lib/profile-mapping.ts`, in `todosToTaskData`, add these two keys to the returned object (after `assigned_character_id: todo.assignedCharacterId,`):
```ts
    scheduled_date: todo.scheduledDate,
    order: todo.order,
```
In `tasksToTodos`, add these two keys to the returned object (after `completedAt: task.completed_at,`):
```ts
      scheduledDate: task.scheduled_date,
      order: task.order,
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm run test -- profile-mapping`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/supabase.ts lib/profile-mapping.ts lib/__tests__/profile-mapping.test.ts
git commit -m "feat: add scheduledDate + order to task model"
```

---

## Task 3: Pure planner logic (`lib/planner.ts`)

**Files:**
- Create: `lib/planner.ts`
- Test: `lib/__tests__/planner.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/planner.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test -- planner`
Expected: FAIL — `Cannot find module '@/lib/planner'`.

- [ ] **Step 3: Implement `lib/planner.ts`**

Create `lib/planner.ts`:
```ts
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
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test -- planner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/planner.ts lib/__tests__/planner.test.ts
git commit -m "feat: add pure weekly-planner scheduling logic"
```

---

## Task 4: `active_companion_id` column

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `lib/supabase.ts` (`UserProfile`)

- [ ] **Step 1: Add the idempotent column**

In `supabase/schema.sql`, find the line
`alter table public.user_profiles add column if not exists persona text;`
and add immediately after it:
```sql
alter table public.user_profiles add column if not exists active_companion_id integer;
```

- [ ] **Step 2: Add the field to `UserProfile`**

In `lib/supabase.ts`, inside `interface UserProfile`, after `persona?: string` (or after the last field before `onboarded`), add:
```ts
  active_companion_id?: number
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. NOTE: a pre-existing baseline error in `components/ui/calendar.tsx` may print — ignore it; only new errors matter.

- [ ] **Step 4: Apply the schema to Supabase**

Run the contents of `supabase/schema.sql` against the Supabase project (SQL editor / `supabase db push`). Idempotent and safe to re-run.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql lib/supabase.ts
git commit -m "feat: add active_companion_id column"
```

---

## Task 5: Planner task card (`components/planner-task-card.tsx`)

**Files:** Create: `components/planner-task-card.tsx`

- [ ] **Step 1: Implement the card**

This is a sortable card. It shows the task text + a complete checkbox + edit affordance, and exposes a drag handle (the whole card is draggable via `useSortable`). Completion and edit are delegated via props.

Create `components/planner-task-card.tsx`:
```tsx
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Pencil } from "lucide-react"
import type { Todo } from "@/lib/types"

interface PlannerTaskCardProps {
  todo: Todo
  companionName?: string
  onToggle: (id: number, el: HTMLElement | null) => void
  onEdit: (todo: Todo) => void
  /** Overdue cards are draggable but rendered with a warning tint. */
  overdue?: boolean
}

export default function PlannerTaskCard({ todo, companionName, onToggle, onEdit, overdue }: PlannerTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`cb-${todo.id}`}
      className={`flex items-center gap-2 rounded-lg p-2 ${
        overdue ? "bg-red-950/40 border border-red-800/40" : "bg-gray-800/60"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-500 hover:text-gray-300"
        aria-label="Drag task"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() =>
          onToggle(todo.id, typeof document !== "undefined" ? document.getElementById(`cb-${todo.id}`) : null)
        }
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${todo.completed ? "line-through text-gray-500" : "text-white"}`}>
          {todo.text}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700 px-1 py-0">{todo.category}</Badge>
          {companionName && (
            <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-700/50 px-1 py-0">{companionName}</Badge>
          )}
        </div>
      </div>
      <button onClick={() => onEdit(todo)} className="text-gray-500 hover:text-white p-1" aria-label="Edit task">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `components/planner-task-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/planner-task-card.tsx
git commit -m "feat: add planner task card"
```

---

## Task 6: Planner day/bucket column (`components/planner-day.tsx`)

**Files:** Create: `components/planner-day.tsx`

- [ ] **Step 1: Implement the droppable column**

A column is a droppable container wrapping a `SortableContext` of its task ids. Empty columns still accept drops (the `useDroppable` ref covers the body). Overdue columns are display-only here (not droppable) — the parent decides droppability via the `droppable` prop.

Create `components/planner-day.tsx`:
```tsx
"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import PlannerTaskCard from "./planner-task-card"
import type { Todo } from "@/lib/types"

interface PlannerDayProps {
  containerId: string
  title: string
  subtitle?: string
  todos: Todo[]
  highlight?: boolean
  overdue?: boolean
  droppable?: boolean
  companionName: (id?: number) => string | undefined
  onToggle: (id: number, el: HTMLElement | null) => void
  onEdit: (todo: Todo) => void
}

export default function PlannerDay({
  containerId, title, subtitle, todos, highlight, overdue, droppable = true, companionName, onToggle, onEdit,
}: PlannerDayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: containerId, disabled: !droppable })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 min-h-[96px] transition-colors ${
        highlight ? "border-purple-500/60 bg-gray-900" : overdue ? "border-red-800/50 bg-gray-900" : "border-gray-800 bg-gray-900"
      } ${isOver && droppable ? "ring-2 ring-purple-500/60" : ""}`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-xs font-bold ${highlight ? "text-purple-300" : overdue ? "text-red-300" : "text-gray-400"}`}>{title}</span>
        {subtitle && <span className="text-[10px] text-gray-500">{subtitle}</span>}
      </div>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {todos.map((t) => (
            <PlannerTaskCard
              key={t.id}
              todo={t}
              companionName={companionName(t.assignedCharacterId)}
              onToggle={onToggle}
              onEdit={onEdit}
              overdue={overdue}
            />
          ))}
          {todos.length === 0 && <p className="text-[11px] text-gray-600 py-2 text-center">—</p>}
        </div>
      </SortableContext>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `components/planner-day.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/planner-day.tsx
git commit -m "feat: add planner day/bucket column"
```

---

## Task 7: Task editor modal (`components/task-editor.tsx`)

**Files:** Create: `components/task-editor.tsx`

- [ ] **Step 1: Implement the editor**

A self-contained fixed-overlay modal (no Radix dependency) for adding/editing a task, including a **day picker**. It returns a full `Todo` via `onSave`. New tasks get `id = Date.now()`; editing preserves the id.

Create `components/task-editor.tsx`:
```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TASK_CATEGORIES, XP_BY_DIFFICULTY } from "@/lib/types"
import type { Character, Difficulty, TaskCategory, Todo } from "@/lib/types"

interface TaskEditorProps {
  open: boolean
  initial?: Todo | null
  /** Default scheduled day for a brand-new task (yyyy-mm-dd or "" for unscheduled). */
  defaultDate?: string
  companions: Character[]
  onClose: () => void
  onSave: (todo: Todo) => void
  onDelete?: (id: number) => void
}

export default function TaskEditor({ open, initial, defaultDate = "", companions, onClose, onSave, onDelete }: TaskEditorProps) {
  const [text, setText] = useState(initial?.text ?? "")
  const [category, setCategory] = useState<TaskCategory>(initial?.category ?? "General")
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "Easy")
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly">(initial?.recurrence ?? "none")
  const [companionId, setCompanionId] = useState<string>(
    initial?.assignedCharacterId ? String(initial.assignedCharacterId) : companions[0] ? String(companions[0].id) : "",
  )
  const [scheduledDate, setScheduledDate] = useState<string>(initial?.scheduledDate ?? defaultDate)

  if (!open) return null

  const save = () => {
    if (!text.trim()) return
    onSave({
      id: initial?.id ?? Date.now(),
      text: text.trim(),
      completed: initial?.completed ?? false,
      xp: XP_BY_DIFFICULTY[difficulty],
      category,
      difficulty,
      recurrence,
      assignedCharacterId: companionId ? Number(companionId) : undefined,
      scheduledDate: scheduledDate || undefined,
      order: initial?.order,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      completedAt: initial?.completedAt,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-white">{initial ? "Edit task" : "Add task"}</h2>
        <Input
          autoFocus
          placeholder="Task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="bg-gray-800 border-gray-700 text-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Easy">Easy · 10 XP</SelectItem>
              <SelectItem value="Medium">Medium · 20 XP</SelectItem>
              <SelectItem value="Hard">Hard · 30 XP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recurrence} onValueChange={(v) => setRecurrence(v as "none" | "daily" | "weekly")}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">One-time</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={companionId} onValueChange={setCompanionId}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue placeholder="Companion" /></SelectTrigger>
            <SelectContent>{companions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] text-gray-400">Plan day (leave empty for Unscheduled)</label>
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={save} disabled={!text.trim()} className="bg-purple-600 hover:bg-purple-700 flex-1">
            {initial ? "Save" : "Add"}
          </Button>
          {initial && onDelete && (
            <Button variant="outline" className="text-red-400 border-red-500/50" onClick={() => onDelete(initial.id)}>Delete</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `components/task-editor.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/task-editor.tsx
git commit -m "feat: add task editor modal with day picker"
```

---

## Task 8: Week planner view (`components/week-planner.tsx`)

**Files:** Create: `components/week-planner.tsx`

- [ ] **Step 1: Implement the planner**

Owns the DnD context and week navigation. Days render as a responsive grid (1 col on mobile → stacked agenda; up to 7 cols on wide screens). Unscheduled + Overdue are shown as extra columns/sections. On drag end it resolves the destination container + index and calls `onMoveTask`.

Create `components/week-planner.tsx`:
```tsx
"use client"

import { useMemo, useState } from "react"
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Menu } from "lucide-react"
import PlannerDay from "./planner-day"
import { WEEKDAY_LABELS, weekStartIso, weekDays, groupTodosForWeek, partitionUnscheduledOverdue } from "@/lib/planner"
import { addDaysIso, todayIso } from "@/lib/date-utils"
import type { Character, Todo } from "@/lib/types"

const UNSCHEDULED = "unscheduled"

interface WeekPlannerProps {
  todos: Todo[]
  companions: Character[]
  onMoveTask: (taskId: number, dayIso: string | null, toIndex: number) => void
  onToggle: (id: number, el: HTMLElement | null) => void
  onEdit: (todo: Todo) => void
  onAdd: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function WeekPlanner({
  todos, companions, onMoveTask, onToggle, onEdit, onAdd, sidebarOpen, setSidebarOpen,
}: WeekPlannerProps) {
  const today = todayIso()
  const [weekStart, setWeekStart] = useState(() => weekStartIso(today))
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const grouped = useMemo(() => groupTodosForWeek(todos, weekStart), [todos, weekStart])
  const { unscheduled, overdue } = useMemo(() => partitionUnscheduledOverdue(todos, today), [todos, today])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const companionName = (id?: number) => companions.find((c) => c.id === id)?.name

  // Build a lookup from any sortable/container id to its container id (a day iso or UNSCHEDULED).
  const containerOf = (id: string | number): string | null => {
    const sid = String(id)
    if (sid === UNSCHEDULED || days.includes(sid)) return sid
    const t = todos.find((x) => x.id === Number(sid))
    if (!t) return null
    if (!t.scheduledDate) return UNSCHEDULED
    return days.includes(t.scheduledDate) ? t.scheduledDate : null
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const dest = containerOf(over.id)
    if (!dest) return // dropped somewhere not droppable (e.g. overdue) — ignore
    const destItems = dest === UNSCHEDULED ? unscheduled : grouped[dest] || []
    // index = position of the card we dropped onto, else append to end
    const overId = Number(over.id)
    const idx = destItems.findIndex((t) => t.id === overId)
    const toIndex = idx >= 0 ? idx : destItems.length
    onMoveTask(Number(active.id), dest === UNSCHEDULED ? null : dest, toIndex)
  }

  const rangeLabel = `${weekStart} → ${addDaysIso(weekStart, 6)}`

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pt-14 lg:pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden bg-gray-900 border border-gray-800">
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Planner</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDaysIso(w, -7))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStartIso(today))} className="text-xs">This week</Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDaysIso(w, 7))}><ChevronRight className="w-4 h-4" /></Button>
          <Button size="sm" onClick={onAdd} className="bg-purple-600 hover:bg-purple-700 ml-1"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">{rangeLabel}</p>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mb-4">
          {days.map((d, i) => (
            <PlannerDay
              key={d}
              containerId={d}
              title={WEEKDAY_LABELS[i]}
              subtitle={d.slice(5)}
              highlight={d === today}
              todos={grouped[d]}
              companionName={companionName}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PlannerDay
            containerId={UNSCHEDULED}
            title="📥 Unscheduled"
            todos={unscheduled}
            companionName={companionName}
            onToggle={onToggle}
            onEdit={onEdit}
          />
          <PlannerDay
            containerId="overdue"
            title="⚠ Overdue"
            todos={overdue}
            overdue
            droppable={false}
            companionName={companionName}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        </div>
      </DndContext>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `components/week-planner.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/week-planner.tsx
git commit -m "feat: add week planner view with dnd-kit drag"
```

---

## Task 9: Extract the `Stat` card

**Files:**
- Create: `components/stat-card.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create the shared component**

The `Stat` function currently lives at the bottom of `app/dashboard/page.tsx`. Move it into its own file. Create `components/stat-card.tsx`:
```tsx
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function Stat({
  icon, label, value, hint, accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  accent: "purple" | "orange" | "green" | "blue"
}) {
  const accentText = {
    purple: "text-purple-400",
    orange: "text-orange-400",
    green: "text-green-400",
    blue: "text-blue-400",
  }[accent]
  return (
    <Card className="bg-gray-900 border-gray-800 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-gray-500">{label}</p>
          {icon}
        </div>
        <p className={`text-xl sm:text-2xl font-bold ${accentText}`}>{value}</p>
        {hint && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{hint}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Delete the local `Stat` and import the new one**

In `app/dashboard/page.tsx`, delete the entire local `function Stat({ ... }) { ... }` definition at the bottom of the file. Then add to the import block (after `import UserLevelBadge from "@/components/user-level-badge"`):
```tsx
import Stat from "@/components/stat-card"
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (the `<Stat ... />` usages in the dashboard still resolve, now via the import).

- [ ] **Step 4: Commit**

```bash
git add components/stat-card.tsx app/dashboard/page.tsx
git commit -m "refactor: extract Stat card into its own component"
```

---

## Task 10: Character hero (`components/character-hero.tsx`)

**Files:** Create: `components/character-hero.tsx`

- [ ] **Step 1: Implement the hero**

Large portrait of the active companion with name/level/bond and latest line; a labeled, reserved zone marks where the future live animation will go. Tapping a crew avatar switches the active companion.

Create `components/character-hero.tsx`:
```tsx
"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Character } from "@/lib/types"

interface CharacterHeroProps {
  active: Character | null
  companions: Character[]
  onSelect: (id: number) => void
}

export default function CharacterHero({ active, companions, onSelect }: CharacterHeroProps) {
  if (!active) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500 min-h-[220px] flex items-center justify-center">
        Pick a companion to get started.
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-purple-950/30 to-gray-900 p-5 flex flex-col items-center text-center relative min-h-[220px]">
      <Avatar className="w-28 h-28 ring-2 ring-purple-500/40">
        <AvatarImage src={active.avatar} />
        <AvatarFallback className="text-3xl">{active.name[0]}</AvatarFallback>
      </Avatar>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-lg font-bold text-white">{active.name}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0">L{active.level}</Badge>
      </div>
      <p className="text-[11px] text-gray-400">Bond {Math.floor(active.bondLevel)}/{active.maxBond}</p>
      {active.lastMessage && (
        <p className="text-xs text-gray-400 italic mt-2 line-clamp-2 max-w-xs">“{active.lastMessage}”</p>
      )}

      {companions.length > 1 && (
        <div className="flex gap-2 mt-4">
          {companions.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`rounded-full ${c.id === active.id ? "ring-2 ring-purple-500" : "opacity-60 hover:opacity-100"}`}
              aria-label={`Switch to ${c.name}`}
            >
              <Avatar className="w-9 h-9"><AvatarImage src={c.avatar} /><AvatarFallback>{c.name[0]}</AvatarFallback></Avatar>
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 text-[9px] text-gray-600 border border-dashed border-gray-700 rounded py-1">
        live animation coming soon
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `components/character-hero.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/character-hero.tsx
git commit -m "feat: add character hero for home"
```

---

## Task 11: Home view (`components/home-view.tsx`)

**Files:** Create: `components/home-view.tsx`

This view reassembles existing dashboard pieces into the new layout: a metrics strip, the `CharacterHero`, a **today-only** task list with quick-add, daily quests, the streak banner, and a chat-launcher bar. It receives everything via props from the dashboard; it owns no persistence.

- [ ] **Step 1: Implement the home view**

Create `components/home-view.tsx`:
```tsx
"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Flame, Plus, Send, Timer, Zap, Menu } from "lucide-react"
import Stat from "@/components/stat-card"
import DailyGoalRing from "@/components/daily-goal-ring"
import UserLevelBadge from "@/components/user-level-badge"
import CharacterHero from "@/components/character-hero"
import DailyQuests from "@/components/daily-quests"
import StreakBanner from "@/components/streak-banner"
import type { Character, DailyQuest, Todo } from "@/lib/types"

interface HomeViewProps {
  username: string
  totalXP: number
  streakCount: number
  completedToday: number
  streakFreezes: number
  plan: "Free" | "Premium"
  hoursLeft: number
  onUseFreeze: () => void
  focusMinutesTotal: number
  xpToday: number
  dailyGoal: number
  userLevel: number
  todayTodos: Todo[]
  todosDoneCount: number
  todosTotalCount: number
  dailyQuests: DailyQuest[]
  companions: Character[]
  activeCompanion: Character | null
  onSelectCompanion: (id: number) => void
  onToggleTodo: (id: number, el: HTMLElement | null) => void
  onQuickAdd: (text: string) => void
  onCompleteQuest: (quest: DailyQuest) => void
  onOpenChat: (prefill: string) => void
  onOpenFocus: () => void
  floatingXp: { id: number; xp: number } | null
  setSidebarOpen: (open: boolean) => void
}

export default function HomeView(props: HomeViewProps) {
  const {
    username, totalXP, streakCount, completedToday, streakFreezes, plan, hoursLeft, onUseFreeze,
    focusMinutesTotal, xpToday, dailyGoal, userLevel, todayTodos, todosDoneCount, todosTotalCount,
    dailyQuests, companions, activeCompanion, onSelectCompanion, onToggleTodo, onQuickAdd,
    onCompleteQuest, onOpenChat, onOpenFocus, floatingXp, setSidebarOpen,
  } = props
  const [quickText, setQuickText] = useState("")
  const [chatText, setChatText] = useState("")

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pt-14 lg:pt-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden bg-gray-900 border border-gray-800">
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold truncate">Hi, {username}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block"><UserLevelBadge totalXp={totalXP} /></div>
          <Button onClick={onOpenFocus} variant="outline" size="sm" className="border-purple-500/40 bg-transparent text-white hover:bg-purple-500/10">
            <Timer className="w-4 h-4 mr-1" /> Focus
          </Button>
        </div>
      </div>

      <StreakBanner
        streakCount={streakCount}
        completedToday={completedToday}
        streakFreezes={streakFreezes}
        plan={plan}
        onUseFreeze={onUseFreeze}
        hoursLeftInDay={Math.ceil(hoursLeft)}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-4">
        <Stat icon={<Zap className="w-5 h-5 text-purple-400" />} label="Total XP" value={totalXP.toString()} accent="purple" />
        <Stat icon={<Flame className="w-5 h-5 text-orange-400" />} label="Streak" value={`${streakCount}d`} accent="orange" />
        <Stat icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} label="Today" value={`${todosDoneCount}/${todosTotalCount}`} accent="green" />
        <Stat icon={<Timer className="w-5 h-5 text-blue-400" />} label="Focus" value={`${focusMinutesTotal}m`} accent="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <CharacterHero active={activeCompanion} companions={companions} onSelect={onSelectCompanion} />
          <DailyGoalRing xpToday={xpToday} goal={dailyGoal} level={userLevel} />
        </div>

        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base text-white">
                <span>Today</span>
                <Badge variant="secondary" className="bg-gray-800 text-white">{todosDoneCount}/{todayTodos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add a task for today…"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickText.trim()) { onQuickAdd(quickText.trim()); setQuickText("") }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <Button
                  onClick={() => { if (quickText.trim()) { onQuickAdd(quickText.trim()); setQuickText("") } }}
                  size="sm"
                  disabled={!quickText.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {todayTodos.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-500">Nothing planned for today.</p>
              ) : (
                <div className="space-y-2">
                  {todayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      id={`cb-${todo.id}`}
                      className={`relative flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 ${floatingXp?.id === todo.id ? "animate-task-pop" : ""}`}
                    >
                      {floatingXp?.id === todo.id && (
                        <span className="animate-float-xp pointer-events-none absolute right-10 top-1 text-sm font-bold text-purple-300">
                          +{floatingXp.xp} XP
                        </span>
                      )}
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() =>
                          onToggleTodo(todo.id, typeof document !== "undefined" ? document.getElementById(`cb-${todo.id}`) : null)
                        }
                      />
                      <p className={`flex-1 text-sm ${todo.completed ? "line-through text-gray-500" : "text-white"}`}>{todo.text}</p>
                      <span className="text-[10px] text-purple-400">+{todo.xp} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DailyQuests quests={dailyQuests} companions={companions} onComplete={onCompleteQuest} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Input
          placeholder={activeCompanion ? `Message ${activeCompanion.name}…` : "Message your companion…"}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onOpenChat(chatText); setChatText("") } }}
          className="bg-gray-900 border-gray-800 text-white"
        />
        <Button onClick={() => { onOpenChat(chatText); setChatText("") }} className="bg-purple-600 hover:bg-purple-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
```

Note: this reuses existing components `DailyQuests`, `StreakBanner`, `DailyGoalRing`, `UserLevelBadge` with the same prop shapes they already accept in the dashboard. The `animate-task-pop`/`animate-float-xp` classes already exist in `app/globals.css`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `components/home-view.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/home-view.tsx
git commit -m "feat: add home view"
```

---

## Task 12: Dashboard — scheduling state, handlers, view type

**Files:** Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add imports**

After `import Stat from "@/components/stat-card"` (added in Task 9), add:
```tsx
import HomeView from "@/components/home-view"
import WeekPlanner from "@/components/week-planner"
import TaskEditor from "@/components/task-editor"
import { moveToDay } from "@/lib/planner"
```

- [ ] **Step 2: Change the View type and default view**

Change the `type View = ...` line to:
```tsx
type View = "home" | "planner" | "chat" | "characters" | "premium" | "profile"
```
Change the `currentView` initializer from `useState<View>("dashboard")` to:
```tsx
  const [currentView, setCurrentView] = useState<View>("home")
```

- [ ] **Step 3: Add new state**

After the `const [editingTodo, setEditingTodo] = useState<number | null>(null)` line, add:
```tsx
  const [activeCompanionId, setActiveCompanionId] = useState<number | null>(null)
  const [taskEditorOpen, setTaskEditorOpen] = useState(false)
  const [taskBeingEdited, setTaskBeingEdited] = useState<Todo | null>(null)
  const [chatPrefill, setChatPrefill] = useState("")
```

- [ ] **Step 4: Load + persist `active_companion_id`**

In the profile-load effect, after `setPersona((profile.persona as PersonaId) ?? null)`, add:
```tsx
      setActiveCompanionId(profile.active_companion_id ?? null)
```
In the debounced save `payload`, after `persona: persona,`, add:
```tsx
        active_companion_id: activeCompanionId ?? undefined,
```
Add `activeCompanionId,` to that effect's dependency array (the array ending with `...soundEnabled, persona,`).

- [ ] **Step 5: Derive the active companion and today's tasks**

After the `const personaHint = getPersonaPromptHint(persona)` line, add:
```tsx
  const activeCompanion =
    userCompanions.find((c) => c.id === activeCompanionId) || userCompanions[0] || null
  const todayTodos = useMemo(
    () => todos.filter((t) => t.scheduledDate === todayIso()),
    [todos],
  )
```

- [ ] **Step 6: Update `addTodo` to schedule for today with an order**

Replace the existing `addTodo` function with:
```tsx
  const addTodo = (textArg?: string) => {
    const text = (textArg ?? newTodo).trim()
    if (!text || userCompanions.length === 0) return
    const assignedId =
      newTodoAssignedCharacterId === "" ? userCompanions[0].id : (newTodoAssignedCharacterId as number)
    const today = todayIso()
    const todayCount = todos.filter((t) => t.scheduledDate === today).length
    setTodos((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        completed: false,
        xp: XP_BY_DIFFICULTY[newTodoDifficulty],
        category: newTodoCategory,
        difficulty: newTodoDifficulty,
        assignedCharacterId: assignedId,
        recurrence: newTodoRecurrence,
        scheduledDate: today,
        order: todayCount,
        createdAt: new Date().toISOString(),
      },
    ])
    setNewTodo("")
  }
```

- [ ] **Step 7: Add planner/editor handlers**

After `completeDailyQuest` (or anywhere among the handlers), add:
```tsx
  const moveTask = (taskId: number, dayIso: string | null, toIndex: number) => {
    setTodos((prev) => moveToDay(prev, taskId, dayIso, toIndex))
  }

  const upsertTask = (task: Todo) => {
    setTodos((prev) => {
      const exists = prev.some((t) => t.id === task.id)
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]
    })
    setTaskEditorOpen(false)
    setTaskBeingEdited(null)
  }

  const openTaskEditor = (todo: Todo | null) => {
    setTaskBeingEdited(todo)
    setTaskEditorOpen(true)
  }

  const openChatFromHome = (prefill: string) => {
    if (!activeCompanion) return
    setChatPrefill(prefill)
    openCharacterChat(activeCompanion)
  }
```

- [ ] **Step 8: Point `backToDashboard` and `selectCompanions` at "home"**

In `backToDashboard`, change `setCurrentView("dashboard")` to `setCurrentView("home")`.
In `selectCompanions`, change `setCurrentView("dashboard")` to `setCurrentView("home")`.

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. The render still references the old `currentView === "dashboard"` block and `Stat`/today JSX — that's replaced in Task 13. (If `tsc` flags the `View` union no longer including `"dashboard"`, that's expected and resolved in Task 13.)

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add planner/home state + handlers to dashboard"
```

---

## Task 13: Dashboard — render Home + Planner, sidebar nav

**Files:** Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace the sidebar nav buttons**

In the `<nav className="space-y-1 mb-6">` block, replace the single "Dashboard" `<Button>` (the one with `currentView === "dashboard"` and the `Target` icon) with these two buttons:
```tsx
          <Button variant="ghost" className={`w-full justify-start ${currentView === "home" ? "bg-gray-800" : ""}`} onClick={() => setCurrentView("home")}>
            <Target className="w-4 h-4 mr-2" /> Home
          </Button>
          <Button variant="ghost" className={`w-full justify-start ${currentView === "planner" ? "bg-gray-800" : ""}`} onClick={() => setCurrentView("planner")}>
            <CalendarDays className="w-4 h-4 mr-2" /> Planner
          </Button>
```
Then add `CalendarDays` to the `lucide-react` import list near the top of the file.

- [ ] **Step 2: Replace the main view-switcher block**

Find the big conditional in the returned JSX that starts with `{currentView === "dashboard" ? (` and renders the entire inline dashboard (stats, StreakBanner, DailyQuests, today tasks card, crew card). Replace the **entire `currentView === "dashboard" ? ( ... )`** branch (everything from `{currentView === "dashboard" ? (` up to the matching `) : currentView === "characters" ? (`) with:
```tsx
        {currentView === "home" ? (
          <HomeView
            username={userInfo.username}
            totalXP={totalXP}
            streakCount={streakCount}
            completedToday={completedToday}
            streakFreezes={streakFreezes}
            plan={userInfo.plan}
            hoursLeft={hoursLeft}
            onUseFreeze={useStreakFreezeNow}
            focusMinutesTotal={focusMinutesTotal}
            xpToday={xpToday}
            dailyGoal={dailyGoal}
            userLevel={userLevelForXp(totalXP)}
            todayTodos={todayTodos}
            todosDoneCount={todayTodos.filter((t) => t.completed).length}
            todosTotalCount={todayTodos.length}
            dailyQuests={dailyQuests}
            companions={userCompanions}
            activeCompanion={activeCompanion}
            onSelectCompanion={(id) => setActiveCompanionId(id)}
            onToggleTodo={toggleTodo}
            onQuickAdd={(text) => addTodo(text)}
            onCompleteQuest={completeDailyQuest}
            onOpenChat={openChatFromHome}
            onOpenFocus={() => setFocusOpen(true)}
            floatingXp={floatingXp}
            setSidebarOpen={setSidebarOpen}
          />
        ) : currentView === "planner" ? (
          <WeekPlanner
            todos={todos}
            companions={userCompanions}
            onMoveTask={moveTask}
            onToggle={toggleTodo}
            onEdit={(todo) => openTaskEditor(todo)}
            onAdd={() => openTaskEditor(null)}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        ) : currentView === "characters" ? (
```

This leaves the existing `characters` / `premium` / `profile` / `chat` branches that follow unchanged.

- [ ] **Step 3: Render the TaskEditor near the FocusTimer**

Immediately before the `<FocusTimer ... />` element near the end of the component, add:
```tsx
      <TaskEditor
        open={taskEditorOpen}
        initial={taskBeingEdited}
        defaultDate={todayIso()}
        companions={userCompanions}
        onClose={() => { setTaskEditorOpen(false); setTaskBeingEdited(null) }}
        onSave={upsertTask}
        onDelete={(id) => { deleteTodo(id); setTaskEditorOpen(false); setTaskBeingEdited(null) }}
      />
```

- [ ] **Step 4: Pass the chat prefill into ChatInterface**

In the `chat` branch where `<ChatInterface ... />` is rendered, the existing props remain. (The chat prefill is optional polish; ChatInterface does not currently accept a prefill prop, so passing it is out of scope — `openChatFromHome` still opens the right companion's chat. Leave ChatInterface as-is.)

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit`
Expected: no new errors beyond the pre-existing `components/ui/calendar.tsx` baseline. The `View` union no longer has `"dashboard"`, and all references now use `"home"`/`"planner"`.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: render home + planner views, add planner nav"
```

---

## Task 14: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Unit tests**

Run: `npm run test`
Expected: PASS — `planner`, `profile-mapping`, plus the existing `leveling`/`celebrations` suites.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: only the pre-existing `calendar.tsx` `tsc` error; build succeeds.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, sign in, and verify:
- Default view is **Home**: metrics strip, character hero (with switchable crew avatars + reserved animation label), today-only task list, daily quests, streak banner, chat bar at the bottom.
- Adding a task on Home creates it for **today**; completing it fires the existing juice/XP/celebrations and advances the daily-goal ring.
- The chat bar opens the active companion's chat.
- **Planner** view: current week Mon–Sun + Unscheduled + Overdue. Add a task (with a day picker), drag a card to reorder within a day, drag across days to reschedule, drag from Unscheduled into a day. On mobile (narrow viewport), columns stack and long-press initiates drag.
- Existing tasks (created before this change) appear under **Unscheduled** on first load.
- Completing a task from the Planner also fires juice/XP.
- ◀ ▶ week navigation works; "today" highlight only shows in the current week.

- [ ] **Step 4: Final commit (if cleanup was needed)**

```bash
git add -A
git commit -m "chore: home + weekly planner verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** plan-day + drag-order (Tasks 3, 8, 12 `moveToDay`) · responsive grid/agenda (Task 8 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-7`) · Unscheduled + Overdue buckets (Tasks 3, 8) · `scheduledDate`/`order` model with no SQL migration (Task 2) · `active_companion_id` column (Task 4) · Home re-layout with metrics/hero/today/quests/streak/chat-launcher (Tasks 9–11, 13) · today-only dashboard list (Task 12 `todayTodos`, Task 13) · completion reuse of `toggleTodo`/`handleTaskCompleted` (Tasks 11, 13 wiring) · `@dnd-kit` with touch sensor + long-press (Task 8) · animation/NLP deferred (CharacterHero reserved zone only; no NLP) · vitest for pure logic (Tasks 2, 3). All covered.
- **Refinement vs spec:** the spec listed both `reorderWithinDay` and `moveToDay`; `moveToDay` handles within-day reordering and cross-day/bucket moves, so a separate `reorderWithinDay` is unnecessary (YAGNI). The Planner add/edit uses a self-contained overlay modal (`task-editor.tsx`), consistent with the existing celebration-overlay pattern, rather than a Radix dialog.
- **Type consistency:** `moveToDay(todos, taskId, dayIso|null, toIndex)` signature is identical across `lib/planner.ts` (Task 3), the dashboard `moveTask` handler (Task 12), and `WeekPlanner.onMoveTask` (Tasks 8, 13). `Todo.scheduledDate`/`order` (Task 2) are consumed by `planner.ts`, `WeekPlanner`, `HomeView`, and `TaskEditor` consistently. `HomeView` props in Task 11 match exactly the props passed in Task 13. `Stat` is exported as a default from `components/stat-card.tsx` (Task 9) and imported by both the dashboard and `HomeView`.
