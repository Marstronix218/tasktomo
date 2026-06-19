# Home + Weekly Planner — Design

**Date:** 2026-06-04
**Status:** Approved (pending implementation plan)
**Scope:** Restructure the single dashboard into a companion-forward **Home** and a dedicated **Planner** (weekly calendar with drag-to-plan), sharing a per-task scheduling model. First slice of the "help users manage a week of tasks" direction.

## Problem

The current app tracks only "today" — every task lives in one undifferentiated list on the dashboard. Users have many tasks across a week and the real pain is **"which do I tackle first?"** There is no way to see what's coming, plan across days, or reorder by priority. The dashboard also crams everything (stats, streak, quests, tasks, crew, chat entry) into one view with no clear focus.

This slice solves the prioritization pain by giving tasks a place in the week, and reorganizes the app into two focused surfaces. It deliberately defers the larger follow-on ideas (natural-language task control; a live-animated character home).

## Goals

- Let users **schedule tasks onto days** across the week and **reorder within a day** to express priority ("which first" = top of today).
- A **Planner** view: responsive weekly calendar, drag to reorder/reschedule, Unscheduled + Overdue buckets, full add/edit/delete.
- A **Home** view: companion-forward hub — metrics, a large active-companion hero, today's tasks, daily quests, and a chat launcher.
- **Reuse the existing completion pipeline** so XP, the daily-goal ring, streaks, and celebrations fire from both surfaces unchanged.

## Non-Goals (deferred to later slices)

- **Live character animation** — Home shows a static portrait with a clearly reserved zone; no animation/Live2D/TTS now.
- **Natural-language task control** ("move my report to Thursday") — slice 2.
- **Separate due-date vs do-date** — only a single plan-day (`scheduledDate`) now.
- **Cross-week recurring expansion** — recurring tasks keep current behavior and carry a single `scheduledDate`.

## Information Architecture

The dashboard view-switcher in [app/dashboard/page.tsx](app/dashboard/page.tsx) changes from `dashboard | chat | characters | premium | profile` to **`home | planner | chat | characters | premium | profile`**, with `home` as the default landing view. Sidebar nav gains **Home** and **Planner** (calendar icon); the Focus-timer button stays.

### Home (companion hub)

- **Metrics strip** (top): user level badge, total XP, streak, daily-goal ring, focus minutes — reusing existing `UserLevelBadge`, `DailyGoalRing`, and the `Stat` card.
- **Character hero** (center): large portrait of the **active companion** with name, level, bond, and latest line. A labeled "live animation (future)" zone is reserved here.
- **Today's tasks** (beside the hero / stacked on mobile): tasks where `scheduledDate === today`, with quick-complete (reuses the existing completion path) and quick-add (defaults to today).
- **Daily quests** and the **streak banner** live on Home.
- **Chat launcher bar** (bottom): a text input that, on submit, opens the existing chat view with the active companion, pre-filled with the typed text. It is a launcher, not a second chat surface.

### Planner (task management)

- **Header:** title, week navigation (◀ ▶ + current range label), and an "Add task" button.
- **Week:** Monday–Sunday. Responsive — a 7-column grid on wide screens, a stacked vertical agenda on mobile. Today's column/section is highlighted.
- **Buckets:** **Unscheduled** (no `scheduledDate`) and **Overdue** (computed: `scheduledDate < today` and incomplete).
- **Drag (`@dnd-kit`):** reorder within a day/bucket; move across days/buckets to reschedule (dropping in a day sets `scheduledDate`; dropping in Unscheduled clears it). Overdue is computed and is not a drop target — dragging an overdue task to a day reschedules it.
- **Task cards:** text, category/difficulty/companion/recurrence badges, a complete checkbox (reuses the completion path), and edit/delete.
- **Add/edit:** a dialog with text, category, difficulty, recurrence, companion, and a **day picker** (`scheduledDate`).

## Data Model

### Task fields (no SQL migration — `tasks` is a JSON array)

Add to `Todo` ([lib/types.ts](lib/types.ts)) and the stored `TaskData` ([lib/supabase.ts](lib/supabase.ts)), mapped both ways in [lib/profile-mapping.ts](lib/profile-mapping.ts):

| Field (Todo) | Field (TaskData) | Type | Meaning |
|---|---|---|---|
| `scheduledDate?` | `scheduled_date?` | `string` (ISO `yyyy-mm-dd`) | Planned day; `undefined` = Unscheduled |
| `order?` | `order?` | `number` | Position within its day/bucket (ascending) |

### New persisted column

| Column | Type | Default | Purpose |
|---|---|---|---|
| `active_companion_id` | int | (null) | Which companion the Home hero shows |

Idempotent `add column if not exists` in [supabase/schema.sql](supabase/schema.sql); optional `active_companion_id?: number` on the `UserProfile` interface; loaded/persisted in the dashboard like the other primitives. Defaults to the first crew member when null.

### Ordering

Within a group (a day, or the Unscheduled bucket), tasks sort by `order` ascending. On drop, the affected group's `order` values are reassigned `0,1,2,…`. Computed by pure helpers in `lib/planner.ts`.

### Back-compat / migration

Existing tasks have no `scheduledDate` → they render in **Unscheduled** on first load (safe; the user drags them into days). New tasks added from Home default to `scheduledDate = today`, preserving the current "added task shows today" behavior. The dashboard's old "all tasks" list becomes Home's **today-only** list.

## Architecture

The orchestrator stays in [app/dashboard/page.tsx](app/dashboard/page.tsx) (owns state, handlers, persistence, and view routing). The two large views and their pieces move into focused components so no single file grows unwieldy.

### New components
- `components/home-view.tsx` — Home layout (metrics strip, hero, today list, quests, streak banner, chat launcher).
- `components/character-hero.tsx` — active-companion portrait + stats + reserved animation zone.
- `components/week-planner.tsx` — Planner: `@dnd-kit` `DndContext`, week nav, responsive grid/agenda, the two buckets.
- `components/planner-day.tsx` — a droppable day/bucket holding sortable cards.
- `components/planner-task-card.tsx` — a draggable task card.
- `components/task-editor.tsx` — add/edit dialog with day picker; shared by Home quick-add and Planner add.

### New pure logic — `lib/planner.ts`
- `weekStartIso(ref)` — Monday of the week containing `ref`.
- `weekDays(weekStartIso)` — the seven ISO day strings.
- `groupTodosForWeek(todos, weekStartIso)` — `{ [dayIso]: Todo[] }` sorted by `order`.
- `partitionUnscheduledOverdue(todos, todayIso)` — `{ unscheduled, overdue }`.
- `reorderWithinDay(todos, dayIso, fromIndex, toIndex)` and `moveToDay(todos, taskId, dayIsoOrNull, toIndex)` — return updated `todos` with reassigned `order`.

Pure functions, written test-first.

### Dependencies
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (React 19-compatible). Installed with `--legacy-peer-deps`.

### Orchestration & data flow
- The dashboard passes `todos` + handlers to Home and Planner.
- **Completion reuses the existing `toggleTodo` → `handleTaskCompleted`**, so juice, XP, the daily-goal ring, streaks, and celebrations fire from both surfaces unchanged.
- New handlers: `rescheduleTask(id, dateOrNull, toIndex)`, `reorderDay(dayIso, fromIndex, toIndex)`, `upsertTask(task)` (add/edit). Plus `activeCompanionId` state + setter.
- All persistence flows through the existing debounced upsert — `scheduled_date`/`order` ride along in the `tasks` JSON; `active_companion_id` is the single new column.
- **Mobile DnD:** `@dnd-kit` `TouchSensor` with a long-press activation delay so dragging doesn't fight page scroll.

## Edge Cases
- **Recurring tasks** keep their current rollover behavior and carry a single `scheduledDate`; a daily-recurring task showing only on its planned day is an accepted slice-1 limitation.
- **Completed tasks** stay on their day, struck-through.
- **Empty days** are valid drop zones.
- **Overdue** is computed, not stored; it is not a drop target — dragging an overdue card to a day reschedules it.
- **Week navigation** only highlights "today" when viewing the current week.
- **No active companion / empty crew** — hero falls back gracefully (first available character or an empty state).

## Testing
- **Unit (vitest):** `lib/planner.ts` — week math (`weekStartIso`, `weekDays`), `groupTodosForWeek`, `partitionUnscheduledOverdue`, `reorderWithinDay`, `moveToDay` (including `order` reassignment and clearing `scheduledDate` for Unscheduled).
- **Type/build:** `npx tsc --noEmit` and `npm run build` (build does not fail on TS errors per CLAUDE.md, so run `tsc` explicitly).
- **Manual:** schedule/reorder/reschedule via drag on desktop and mobile; complete from both Home and Planner and confirm juice/XP/celebrations; week navigation; Unscheduled/Overdue behavior; chat launcher opens the active companion's chat pre-filled.
