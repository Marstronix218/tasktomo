# Completion Juice + User Levels — Design

**Date:** 2026-06-03
**Status:** Approved (pending implementation plan)
**Scope:** First retention slice — make task completion *feel* great, and add a user-level progression spine with a level-scaled daily goal.

## Problem

The app currently works but feels flat. Completing a task is a silent checkbox toggle that adds XP and posts an AI praise toast — no animation, no payoff at the moment of the click. There is no overarching sense of personal progression (only per-character levels), and no daily target to pull the user back tomorrow. The result reads as "a todo app with a chatbot attached."

This slice targets the cheapest, lowest-risk, highest-emotional-payoff lever: the **feel** of completion plus a **progression spine** (user level) and a **come-back-tomorrow hook** (daily goal). It deliberately does NOT attempt the larger "AI actually helps" or "verification" directions.

## Goals

- Make every task/quest/focus completion satisfying (inline juice).
- Add a **user level** derived from total XP, with an escalating curve.
- Add a **daily XP goal** that scales with user level, shown as a dashboard ring.
- Celebrate **milestones** with a queued character-driven overlay (animation + confetti + sound).
- Keep the footprint small: one runtime dep (`canvas-confetti`) + one dev dep (`vitest`).

## Non-Goals (YAGNI)

- No AI-helper / task-breakdown features.
- No verification / proof-of-completion layer.
- No social features or leaderboards.
- Daily goal is **not** manually configurable — it is derived from user level.
- Sound is a small asset set (a completion pop + a level-up flourish), not a full sound theme.

## Experience

Three layers of feedback, escalating in weight:

### 1. Inline micro-juice — every completion

On every task toggle, daily-quest completion, and focus-session completion:
- Checkmark springs in.
- Task text strikes through.
- A floating `+XP` rises from the row.
- A small confetti burst at the checkbox.
- A short "pop" sound (if sound enabled).
- The daily-goal ring ticks up.

Stays in flow — no modal, no interruption.

### 2. Daily goal ring — dashboard

- A circular SVG progress ring on the dashboard showing `xpToday / dailyGoal`.
- `dailyGoal = min(40 + 10 × userLevel, 150)`.
- Fills as XP is earned during the day; resets at day rollover.

### 3. Milestone celebration overlay — queued, one at a time

A Radix Dialog that animates in with confetti + sound, showing the relevant character reacting. Fires on:

| Trigger | Condition |
|---|---|
| User level-up | `userLevelForXp(newTotalXp) > userLevelForXp(oldTotalXp)` |
| Character level-up | character crosses a level (existing logic) |
| Bond level-up | assigned character's bond crosses a whole level (existing logic) |
| Streak milestone | streak crosses 3 / 7 / 14 / 30 |
| Daily goal reached | `xpToday` crosses `dailyGoal` (only once per day) |

**Sound:** on by default, mute toggle in Profile. Respects `prefers-reduced-motion` (calm fallback: no confetti / minimal motion) and the mute preference.

## Leveling Model

**User level (new, derived from `total_xp`):**
- Escalating curve. Level *N* → *N+1* costs `100 × N` XP.
- Cumulative XP to *reach* level *L* = `50 × L × (L − 1)`.
- `userLevelForXp(xp) = floor((50 + sqrt(2500 + 200 × xp)) / 100)` (returns 1 at xp = 0, 2 at 100, 3 at 300, 4 at 600…).
- **Not persisted** — always derived from `total_xp`, so it stays consistent and needs no migration.

**Daily goal:** `dailyGoalForLevel(level) = min(40 + 10 × level, 150)`.

(Character levels are unchanged: `floor(xp / 100) + 1`, separate system.)

## Architecture

### New pure logic — `lib/leveling.ts`
- `userLevelForXp(totalXp): number`
- `xpForLevel(level): number` — cumulative XP to reach a level
- `levelProgress(totalXp): { level, into, needed, pct }` — for the badge/progress bar
- `dailyGoalForLevel(level): number`

Pure functions, written test-first.

### New logic — `lib/celebrations.ts`
- Celebration event types (`{ kind, character?, level?, streak?, ... }`).
- A helper that takes a "completion result" (old/new XP, old/new streak, char updates, xpToday) and returns an ordered array of celebration events.
- **Ordering:** smallest → biggest so the sequence climaxes on the user level-up: `streak → bond → char-level → daily-goal → user-level`.

### New components
- `components/daily-goal-ring.tsx` — SVG ring, props `{ xpToday, goal, level }`.
- `components/celebration-overlay.tsx` — Radix Dialog driven by the celebration queue; renders one event at a time, "Continue" pops the head. Handles all variants, confetti, sound, spring-in animation.
- `components/user-level-badge.tsx` — user level + mini progress bar, placed in the header / stats area.
- `components/completion-burst.tsx` (or a small hook) — inline per-row juice: floating `+XP`, confetti at the checkbox coordinates, spring check.

### New infra
- `hooks/use-sound.ts` — Web Audio API tone synthesis (no asset files), gated by the mute pref (not by `prefers-reduced-motion`).
### Orchestration — `app/dashboard/page.tsx`
- `handleTaskCompleted` remains the single XP choke point. Extended to:
  - track `xpToday` (increment by `xpGained`),
  - compute user level before/after,
  - detect daily-goal crossing and streak-threshold crossing,
  - build celebration events (via `lib/celebrations.ts`) and push them into a new `celebrationQueue` state.
- Event-building happens **outside** the `setState` updater (respects the existing StrictMode double-invoke guard noted in the file).
- `toggleTodo` / `completeDailyQuest` additionally trigger the inline burst on their originating row.
- `celebration-overlay` renders the head of `celebrationQueue`.

## Data Model

New persisted fields on `user_profiles` (idempotent `add column if not exists`):

| Field | Type | Default | Purpose |
|---|---|---|---|
| `xp_today` | int | 0 | XP earned today, drives the ring |
| `xp_today_date` | text | — | ISO date the counter belongs to |
| `daily_goal` | int | derived | Frozen per-day XP target for the ring + celebration |
| `sound_enabled` | boolean | true | Mute preference |

- Mirror these in the `UserProfile` interfaces in [lib/supabase.ts](lib/supabase.ts) and the React state shape; map them in [lib/profile-mapping.ts](lib/profile-mapping.ts).
- Persist them in the dashboard's debounced upsert payload.
- **User level is derived, not stored.**

### Day rollover
The existing daily `useEffect` (recurring-task reset) also resets `xp_today` to 0 when `xp_today_date` ≠ today, and sets `xp_today_date` to today.

## Edge Cases
- **Multiple simultaneous celebrations** — queue plays them in order (`streak → bond → char-level → daily-goal → user-level`).
- **Daily goal already reached earlier today** — do not re-fire the daily-goal celebration.
- **StrictMode double-invoke** — build events outside the state updater to avoid duplicate queue entries.
- **`prefers-reduced-motion`** — skip confetti and heavy motion; show a calm version of overlays/bursts.
- **Sound muted** — no audio; visuals still play.
- **xp_today migration** — existing users start at 0 for the current day (acceptable; resets cleanly next day).

## Testing
- **Unit (vitest, dev-only):** `lib/leveling.ts` and `lib/celebrations.ts` — written test-first. Cover the curve boundaries (0, 99, 100, 299, 300, 600 XP), daily-goal cap, streak thresholds, and event ordering.
- **Type/lint:** `tsc --noEmit` and `next lint` (build does not fail on TS errors per CLAUDE.md, so run these explicitly).
- **Manual:** complete tasks and observe the ring + inline burst; trigger each celebration variant; verify mute toggle and reduced-motion behavior.

## Dependencies
- Runtime: `canvas-confetti` (~6 kb, zero-dep).
- Dev: `vitest`.
- Sound: synthesized via the Web Audio API (no asset files).
- Install reminder: `npm install --legacy-peer-deps` per CLAUDE.md.
