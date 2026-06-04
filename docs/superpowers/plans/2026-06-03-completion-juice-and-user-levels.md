# Completion Juice + User Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make task completion feel great (inline juice + milestone celebrations) and add a user-level progression spine with a level-scaled daily XP goal.

**Architecture:** Pure leveling/celebration logic lives in testable `lib/` modules. `app/dashboard/page.tsx` remains the single XP choke point (`handleTaskCompleted`) and becomes the producer of a celebration queue. New presentational components (daily-goal ring, user-level badge, celebration overlay, inline burst) consume that state. Sound is generated with the Web Audio API (no asset files). User level is derived from `total_xp` (never stored); three new persisted primitive fields track daily XP and the sound preference.

**Tech Stack:** Next.js 15 / React 19 / TypeScript / Tailwind, `canvas-confetti` (new runtime dep), `vitest` (new dev dep), Web Audio API, Supabase.

**Spec:** [docs/superpowers/specs/2026-06-03-completion-juice-and-user-levels-design.md](../specs/2026-06-03-completion-juice-and-user-levels-design.md)

---

## File Structure

**New files:**
- `lib/leveling.ts` — pure user-level + daily-goal math.
- `lib/celebrations.ts` — celebration event types + `buildCelebrations()` ordering logic.
- `lib/confetti.ts` — `canvas-confetti` wrappers with reduced-motion guard.
- `hooks/use-sound.ts` — Web Audio tone player gated by the mute preference.
- `components/daily-goal-ring.tsx` — SVG progress ring.
- `components/user-level-badge.tsx` — user level + progress bar.
- `components/celebration-overlay.tsx` — queued milestone overlay.
- `lib/__tests__/leveling.test.ts`, `lib/__tests__/celebrations.test.ts` — vitest unit tests.
- `vitest.config.ts` — test config.

**Modified files:**
- `package.json` — deps + test scripts.
- `supabase/schema.sql` — three idempotent column adds.
- `lib/supabase.ts` — `UserProfile` interface fields.
- `app/dashboard/page.tsx` — state, load, persist, day-rollover reset, `handleTaskCompleted` extension, render ring/badge/overlay, inline burst.
- `components/user-profile.tsx` — sound mute toggle.
- `app/globals.css` — keyframes for the floating `+XP` and spring pulse.

---

## Task 1: Install dependencies and set up vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
npm install canvas-confetti --legacy-peer-deps
npm install -D vitest @types/canvas-confetti --legacy-peer-deps
```
Expected: installs succeed (the `--legacy-peer-deps` flag is required per CLAUDE.md).

- [ ] **Step 2: Add test scripts to package.json**

In `package.json`, change the `"scripts"` block to:
```json
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "lint": "next lint",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Step 4: Verify the test runner works (no tests yet)**

Run: `npm run test`
Expected: vitest runs and reports "No test files found" (exit is fine) — confirms the runner is wired.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add canvas-confetti + vitest"
```

---

## Task 2: User-level math (`lib/leveling.ts`)

**Files:**
- Create: `lib/leveling.ts`
- Test: `lib/__tests__/leveling.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/leveling.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { userLevelForXp, xpForLevel, levelProgress, dailyGoalForLevel } from "@/lib/leveling"

describe("userLevelForXp", () => {
  it("is level 1 at 0 and below the first threshold", () => {
    expect(userLevelForXp(0)).toBe(1)
    expect(userLevelForXp(99)).toBe(1)
  })
  it("crosses to level 2 at exactly 100 XP", () => {
    expect(userLevelForXp(100)).toBe(2)
    expect(userLevelForXp(299)).toBe(2)
  })
  it("crosses to level 3 at 300 and level 4 at 600", () => {
    expect(userLevelForXp(300)).toBe(3)
    expect(userLevelForXp(599)).toBe(3)
    expect(userLevelForXp(600)).toBe(4)
  })
  it("never returns below 1 for negative input", () => {
    expect(userLevelForXp(-50)).toBe(1)
  })
})

describe("xpForLevel", () => {
  it("returns cumulative XP needed to reach a level", () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(xpForLevel(4)).toBe(600)
  })
})

describe("levelProgress", () => {
  it("reports progress within the current level", () => {
    const p = levelProgress(150)
    expect(p.level).toBe(2)
    expect(p.into).toBe(50)
    expect(p.needed).toBe(200)
    expect(p.pct).toBe(25)
  })
  it("is 0% at the start of a level", () => {
    expect(levelProgress(100).pct).toBe(0)
  })
})

describe("dailyGoalForLevel", () => {
  it("grows with level and caps at 150", () => {
    expect(dailyGoalForLevel(1)).toBe(50)
    expect(dailyGoalForLevel(3)).toBe(70)
    expect(dailyGoalForLevel(11)).toBe(150)
    expect(dailyGoalForLevel(20)).toBe(150)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module '@/lib/leveling'`.

- [ ] **Step 3: Implement `lib/leveling.ts`**

Create `lib/leveling.ts`:
```ts
// User-level progression. Level is derived from total XP and never stored.
// Escalating curve: level N -> N+1 costs 100 * N XP.
// Cumulative XP to reach level L = 50 * L * (L - 1).

export function userLevelForXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  return Math.floor((50 + Math.sqrt(2500 + 200 * totalXp)) / 100)
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return 50 * level * (level - 1)
}

export function levelProgress(totalXp: number): {
  level: number
  into: number
  needed: number
  pct: number
} {
  const level = userLevelForXp(totalXp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const into = totalXp - base
  const needed = next - base
  const pct = needed > 0 ? Math.min(100, Math.max(0, Math.round((into / needed) * 100))) : 0
  return { level, into, needed, pct }
}

export function dailyGoalForLevel(level: number): number {
  return Math.min(40 + 10 * level, 150)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS — all `leveling` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/leveling.ts lib/__tests__/leveling.test.ts
git commit -m "feat: add user-level + daily-goal math"
```

---

## Task 3: Celebration event model (`lib/celebrations.ts`)

**Files:**
- Create: `lib/celebrations.ts`
- Test: `lib/__tests__/celebrations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/celebrations.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { buildCelebrations, STREAK_MILESTONES, type CompletionResult } from "@/lib/celebrations"
import type { Character } from "@/lib/types"

const char = (id: number, name: string): Character => ({
  id, name, avatar: "", level: 1, personality: "", description: "",
  bondLevel: 0, maxBond: 10, prompt: "", xp: 0, tasksCompleted: 0,
})

const base = (over: Partial<CompletionResult> = {}): CompletionResult => ({
  xpGained: 10,
  oldTotalXp: 0,
  newTotalXp: 10,
  oldStreak: 1,
  newStreak: 1,
  oldXpToday: 0,
  newXpToday: 10,
  dailyGoal: 50,
  focusCharacter: char(1, "Nova"),
  characterLevelUps: [],
  bondLevelUps: [],
  ...over,
})

describe("buildCelebrations", () => {
  it("returns nothing for an ordinary completion", () => {
    expect(buildCelebrations(base())).toEqual([])
  })

  it("fires a streak celebration only when a milestone is crossed", () => {
    expect(buildCelebrations(base({ oldStreak: 2, newStreak: 3 })).map((c) => c.kind)).toEqual(["streak"])
    expect(buildCelebrations(base({ oldStreak: 3, newStreak: 4 }))).toEqual([])
  })

  it("fires a daily-goal celebration only on the crossing completion", () => {
    expect(buildCelebrations(base({ oldXpToday: 40, newXpToday: 60, dailyGoal: 50 })).map((c) => c.kind)).toEqual(["daily-goal"])
    expect(buildCelebrations(base({ oldXpToday: 60, newXpToday: 70, dailyGoal: 50 }))).toEqual([])
  })

  it("fires a user-level celebration when the user levels up", () => {
    const out = buildCelebrations(base({ oldTotalXp: 90, newTotalXp: 110 }))
    expect(out.map((c) => c.kind)).toEqual(["user-level"])
    expect(out[0].level).toBe(2)
  })

  it("emits one celebration per character/bond level-up", () => {
    const out = buildCelebrations(base({
      characterLevelUps: [{ character: char(1, "Nova"), level: 2 }],
      bondLevelUps: [{ character: char(2, "Rook"), level: 1 }],
    }))
    expect(out.map((c) => c.kind).sort()).toEqual(["bond", "character-level"])
  })

  it("orders multiple celebrations smallest -> biggest (climaxing on user-level)", () => {
    const out = buildCelebrations(base({
      oldStreak: 2, newStreak: 3,
      oldXpToday: 40, newXpToday: 120, dailyGoal: 50,
      oldTotalXp: 90, newTotalXp: 120,
      characterLevelUps: [{ character: char(1, "Nova"), level: 2 }],
      bondLevelUps: [{ character: char(1, "Nova"), level: 1 }],
    }))
    expect(out.map((c) => c.kind)).toEqual(["streak", "bond", "character-level", "daily-goal", "user-level"])
  })

  it("exposes the streak milestones", () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module '@/lib/celebrations'`.

- [ ] **Step 3: Implement `lib/celebrations.ts`**

Create `lib/celebrations.ts`:
```ts
import type { Character } from "./types"
import { userLevelForXp } from "./leveling"

export type CelebrationKind = "streak" | "bond" | "character-level" | "daily-goal" | "user-level"

export interface Celebration {
  kind: CelebrationKind
  character?: Character
  level?: number
  streak?: number
  xpGained: number
}

export interface CompletionResult {
  xpGained: number
  oldTotalXp: number
  newTotalXp: number
  oldStreak: number
  newStreak: number
  oldXpToday: number
  newXpToday: number
  dailyGoal: number
  /** Character used for events that aren't tied to a specific companion. */
  focusCharacter?: Character
  characterLevelUps: { character: Character; level: number }[]
  bondLevelUps: { character: Character; level: number }[]
}

export const STREAK_MILESTONES = [3, 7, 14, 30]

// Smallest -> biggest, so a multi-celebration sequence climaxes on the user level-up.
const ORDER: CelebrationKind[] = ["streak", "bond", "character-level", "daily-goal", "user-level"]

export function buildCelebrations(r: CompletionResult): Celebration[] {
  const out: Celebration[] = []

  const crossedStreak = STREAK_MILESTONES.find((m) => r.oldStreak < m && r.newStreak >= m)
  if (crossedStreak) {
    out.push({ kind: "streak", streak: crossedStreak, character: r.focusCharacter, xpGained: r.xpGained })
  }

  for (const b of r.bondLevelUps) {
    out.push({ kind: "bond", character: b.character, level: b.level, xpGained: r.xpGained })
  }

  for (const c of r.characterLevelUps) {
    out.push({ kind: "character-level", character: c.character, level: c.level, xpGained: r.xpGained })
  }

  if (r.oldXpToday < r.dailyGoal && r.newXpToday >= r.dailyGoal) {
    out.push({ kind: "daily-goal", character: r.focusCharacter, xpGained: r.xpGained })
  }

  const oldLevel = userLevelForXp(r.oldTotalXp)
  const newLevel = userLevelForXp(r.newTotalXp)
  if (newLevel > oldLevel) {
    out.push({ kind: "user-level", level: newLevel, character: r.focusCharacter, xpGained: r.xpGained })
  }

  return out.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS — all `celebrations` and `leveling` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/celebrations.ts lib/__tests__/celebrations.test.ts
git commit -m "feat: add celebration event model"
```

---

## Task 4: Confetti helpers (`lib/confetti.ts`)

**Files:**
- Create: `lib/confetti.ts`

- [ ] **Step 1: Implement the confetti wrappers**

Create `lib/confetti.ts`:
```ts
import confetti from "canvas-confetti"

const COLORS = ["#a855f7", "#ec4899", "#f59e0b", "#22d3ee", "#ffffff"]

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** Small burst anchored to an element (used for inline task completion). */
export function fireConfettiAt(el: HTMLElement | null): void {
  if (reducedMotion() || typeof window === "undefined") return
  let x = 0.5
  let y = 0.5
  if (el) {
    const r = el.getBoundingClientRect()
    x = (r.left + r.width / 2) / window.innerWidth
    y = (r.top + r.height / 2) / window.innerHeight
  }
  confetti({
    particleCount: 40,
    spread: 55,
    startVelocity: 28,
    scalar: 0.8,
    ticks: 120,
    origin: { x, y },
    colors: COLORS,
  })
}

/** Big centered burst (used for milestone celebrations). */
export function fireConfettiBurst(): void {
  if (reducedMotion() || typeof window === "undefined") return
  confetti({
    particleCount: 130,
    spread: 100,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.4 },
    colors: COLORS,
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `lib/confetti.ts` (the `@types/canvas-confetti` dep from Task 1 provides the types).

- [ ] **Step 3: Commit**

```bash
git add lib/confetti.ts
git commit -m "feat: add confetti helpers with reduced-motion guard"
```

---

## Task 5: Sound hook (`hooks/use-sound.ts`)

**Files:**
- Create: `hooks/use-sound.ts`

- [ ] **Step 1: Implement the Web Audio sound hook**

Create `hooks/use-sound.ts`:
```ts
import { useCallback, useRef } from "react"

export type SoundName = "pop" | "levelup" | "celebrate"

/**
 * Lightweight Web Audio tone player. No asset files — tones are synthesized.
 * Gated by `enabled` (the user's mute preference). Sound is NOT gated by
 * prefers-reduced-motion (that only suppresses visual motion).
 */
export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = (): AudioContext | null => {
    if (typeof window === "undefined") return null
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctxRef.current = new AC()
    }
    return ctxRef.current
  }

  const tone = (ctx: AudioContext, freq: number, start: number, dur: number, gain = 0.15) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(gain, start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + dur)
  }

  return useCallback(
    (name: SoundName) => {
      if (!enabled) return
      const ctx = getCtx()
      if (!ctx) return
      if (ctx.state === "suspended") void ctx.resume()
      const t = ctx.currentTime
      if (name === "pop") {
        tone(ctx, 660, t, 0.12)
      } else if (name === "levelup") {
        ;[523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, t + i * 0.09, 0.2))
      } else {
        ;[659, 880].forEach((f, i) => tone(ctx, f, t + i * 0.08, 0.16))
      }
    },
    [enabled],
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `hooks/use-sound.ts`.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-sound.ts
git commit -m "feat: add Web Audio sound hook"
```

---

## Task 6: Data model — new persisted fields

**Files:**
- Modify: `supabase/schema.sql:36` (append after the last idempotent add)
- Modify: `lib/supabase.ts:71-77` (UserProfile interface)

- [ ] **Step 1: Add idempotent columns to schema**

In `supabase/schema.sql`, immediately after the line
`alter table public.user_profiles add column if not exists plan_renews_at timestamptz;`
add:
```sql
alter table public.user_profiles add column if not exists xp_today integer not null default 0;
alter table public.user_profiles add column if not exists xp_today_date text;
alter table public.user_profiles add column if not exists sound_enabled boolean not null default true;
```

- [ ] **Step 2: Add the fields to the `UserProfile` interface**

In `lib/supabase.ts`, inside the `UserProfile` interface, after `focus_minutes_total?: number`, add:
```ts
  xp_today?: number
  xp_today_date?: string
  sound_enabled?: boolean
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Apply the schema to Supabase**

Run the contents of `supabase/schema.sql` against your Supabase project (SQL editor or `supabase db push`). The adds are idempotent and safe to re-run.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql lib/supabase.ts
git commit -m "feat: add xp_today, xp_today_date, sound_enabled columns"
```

---

## Task 7: Daily-goal ring component

**Files:**
- Create: `components/daily-goal-ring.tsx`

- [ ] **Step 1: Implement the ring**

Create `components/daily-goal-ring.tsx`:
```tsx
"use client"

interface DailyGoalRingProps {
  xpToday: number
  goal: number
  level: number
}

export default function DailyGoalRing({ xpToday, goal, level }: DailyGoalRingProps) {
  const pct = goal > 0 ? Math.min(100, Math.round((xpToday / goal) * 100)) : 0
  const radius = 27
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  const reached = xpToday >= goal

  return (
    <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#262631" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="url(#dailyGoalGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
          <defs>
            <linearGradient id="dailyGoalGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a855f7" />
              <stop offset="1" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {Math.min(xpToday, goal)}/{goal}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">Daily goal</div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {reached ? "Goal reached today 🎉" : `${goal - xpToday} XP to go · scales with level ${level}`}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/daily-goal-ring.tsx
git commit -m "feat: add daily-goal ring component"
```

---

## Task 8: User-level badge component

**Files:**
- Create: `components/user-level-badge.tsx`

- [ ] **Step 1: Implement the badge**

Create `components/user-level-badge.tsx`:
```tsx
"use client"

import { levelProgress } from "@/lib/leveling"

interface UserLevelBadgeProps {
  totalXp: number
}

export default function UserLevelBadge({ totalXp }: UserLevelBadgeProps) {
  const { level, into, needed, pct } = levelProgress(totalXp)
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white text-sm font-bold flex-shrink-0">
        {level}
      </div>
      <div className="min-w-[90px]">
        <div className="text-[11px] text-gray-400 leading-none mb-1">
          Level {level} · {into}/{needed} XP
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            style={{ width: `${pct}%`, transition: "width 500ms ease" }}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/user-level-badge.tsx
git commit -m "feat: add user-level badge component"
```

---

## Task 9: Celebration overlay component

**Files:**
- Create: `components/celebration-overlay.tsx`

- [ ] **Step 1: Implement the overlay**

Create `components/celebration-overlay.tsx`. It renders the head of the celebration queue, fires confetti + sound on mount, and calls `onDismiss` when the user clicks Continue.
```tsx
"use client"

import { useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { fireConfettiBurst } from "@/lib/confetti"
import type { Celebration } from "@/lib/celebrations"
import type { SoundName } from "@/hooks/use-sound"

interface CelebrationOverlayProps {
  celebration: (Celebration & { key: number }) | null
  onDismiss: () => void
  playSound: (name: SoundName) => void
}

function headline(c: Celebration): { title: string; sub: string } {
  switch (c.kind) {
    case "user-level":
      return { title: `⭐ Level ${c.level}!`, sub: "You leveled up. Your daily goal just grew." }
    case "character-level":
      return { title: `🎉 ${c.character?.name ?? "Companion"} reached Level ${c.level}`, sub: "Your bond is paying off." }
    case "bond":
      return { title: `💜 Bond Level ${c.level}`, sub: `${c.character?.name ?? "Your companion"} feels closer to you.` }
    case "streak":
      return { title: `🔥 ${c.streak}-day streak!`, sub: "Don't break the chain." }
    case "daily-goal":
      return { title: "✅ Daily goal complete!", sub: "You hit your XP target for today." }
  }
}

export default function CelebrationOverlay({ celebration, onDismiss, playSound }: CelebrationOverlayProps) {
  useEffect(() => {
    if (!celebration) return
    fireConfettiBurst()
    playSound(celebration.kind === "user-level" ? "levelup" : "celebrate")
    // Re-run for each distinct celebration (key changes per queued item).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration?.key])

  if (!celebration) return null
  const { title, sub } = headline(celebration)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-xs bg-gray-900 border border-purple-500/40 rounded-2xl p-6 text-center animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {celebration.character && (
          <Avatar className="w-16 h-16 mx-auto mb-3 ring-2 ring-purple-500/50">
            <AvatarImage src={celebration.character.avatar} />
            <AvatarFallback>{celebration.character.name[0]}</AvatarFallback>
          </Avatar>
        )}
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">{sub}</p>
        <p className="text-purple-300 font-semibold text-sm mt-3">+{celebration.xpGained} XP</p>
        <Button onClick={onDismiss} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

Note: `animate-in zoom-in-95 fade-in` are provided by `tailwindcss-animate` (already a dependency).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/celebration-overlay.tsx
git commit -m "feat: add celebration overlay component"
```

---

## Task 10: Floating-XP + spring keyframes

**Files:**
- Modify: `app/globals.css` (append at end of file)

- [ ] **Step 1: Add keyframes**

Append to `app/globals.css`:
```css
/* Completion juice */
@keyframes float-xp {
  0% { opacity: 0; transform: translateY(0) scale(0.8); }
  20% { opacity: 1; transform: translateY(-6px) scale(1); }
  100% { opacity: 0; transform: translateY(-28px) scale(1); }
}
.animate-float-xp {
  animation: float-xp 800ms ease-out forwards;
}

@keyframes task-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.015); }
  100% { transform: scale(1); }
}
.animate-task-pop {
  animation: task-pop 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-float-xp, .animate-task-pop { animation: none; }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add completion-juice keyframes"
```

---

## Task 11: Dashboard — state, load, persist, day-rollover reset

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add imports**

In `app/dashboard/page.tsx`, after the existing component imports (after `import UserProfilePanel from "@/components/user-profile"`), add:
```tsx
import CelebrationOverlay from "@/components/celebration-overlay"
import DailyGoalRing from "@/components/daily-goal-ring"
import UserLevelBadge from "@/components/user-level-badge"
```
After the `import { generateDailyQuests } ...` line, add:
```tsx
import { dailyGoalForLevel, userLevelForXp } from "@/lib/leveling"
import { buildCelebrations, type Celebration } from "@/lib/celebrations"
import { fireConfettiAt } from "@/lib/confetti"
import { useSound } from "@/hooks/use-sound"
```

- [ ] **Step 2: Add new state**

In `app/dashboard/page.tsx`, after the line `const [focusMinutesTotal, setFocusMinutesTotal] = useState(0)`, add:
```tsx
  const [xpToday, setXpToday] = useState(0)
  const [xpTodayDate, setXpTodayDate] = useState(todayIso())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [celebrationQueue, setCelebrationQueue] = useState<(Celebration & { key: number })[]>([])
  const [floatingXp, setFloatingXp] = useState<{ id: number; xp: number } | null>(null)
  const celebrationKeyRef = useRef(0)
```

- [ ] **Step 3: Add the sound hook**

After the `const saveTimeoutRef = ...` line, add:
```tsx
  const playSound = useSound(soundEnabled)
```

- [ ] **Step 4: Load the new fields on profile hydrate**

In the profile-load effect, after the line `setFocusMinutesTotal(profile.focus_minutes_total || 0)`, add:
```tsx
      setSoundEnabled(profile.sound_enabled ?? true)
      if (profile.xp_today_date === todayIso()) {
        setXpToday(profile.xp_today || 0)
        setXpTodayDate(profile.xp_today_date)
      } else {
        setXpToday(0)
        setXpTodayDate(todayIso())
      }
```

- [ ] **Step 5: Persist the new fields**

In the debounced save effect, inside the `payload` object, after `focus_minutes_total: focusMinutesTotal,`, add:
```tsx
        xp_today: xpToday,
        xp_today_date: xpTodayDate,
        sound_enabled: soundEnabled,
```
Then add `xpToday, xpTodayDate, soundEnabled,` to the effect's dependency array (the array that currently ends with `streakFreezes, focusMinutesTotal,`).

- [ ] **Step 6: Reset xp_today on day rollover**

In the day-rollover effect (the one that resets recurring tasks and regenerates daily quests), inside the `if (daysSince > 1) { ... }` sibling logic — specifically right before `setDailyQuests(generateDailyQuests(today, userCompanions))` near the end of that effect — add:
```tsx
    setXpToday(0)
    setXpTodayDate(today)
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (`celebrationQueue`, `floatingXp`, `playSound` are unused so far — that's fine; they're wired in the next tasks. If `next lint` flags unused vars, it will be resolved by Task 12-13.)

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add daily-XP + sound + celebration state to dashboard"
```

---

## Task 12: Dashboard — produce celebrations in `handleTaskCompleted`

**Files:**
- Modify: `app/dashboard/page.tsx` — replace the `handleTaskCompleted` function body.

- [ ] **Step 1: Replace `handleTaskCompleted`**

Replace the entire `handleTaskCompleted` function (currently `const handleTaskCompleted = async (...) => { ... }`) with this version. It tracks `xpToday`, captures character/bond level-ups, and enqueues celebrations.
```tsx
  const handleTaskCompleted = async (
    taskText: string,
    category: string,
    xpGained: number,
    primaryCharacter?: Character,
  ) => {
    const today = todayIso()

    const oldTotalXp = totalXP
    const newTotalXp = totalXP + xpGained
    setTotalXP(newTotalXp)

    const oldStreak = streakCount
    let newStreak = streakCount
    if (lastLogin !== today || completedToday === 0) {
      newStreak = streakCount + 1
      setStreakCount(newStreak)
    }
    setLastLogin(today)

    const oldXpToday = xpTodayDate === today ? xpToday : 0
    const newXpToday = oldXpToday + xpGained
    setXpToday(newXpToday)
    setXpTodayDate(today)

    const reactors = primaryCharacter ? [primaryCharacter] : userCompanions
    const reactorIds = new Set(reactors.map((r) => r.id))
    const messages = await Promise.all(
      reactors.map(async (c) => ({ c, msg: await generateAITaskMessage(c, taskText, category) })),
    )

    const newSystemMessages: string[] = []
    const chatUpdates: { characterId: number; aiMsg: string }[] = []
    const characterLevelUps: { character: Character; level: number }[] = []
    const bondLevelUps: { character: Character; level: number }[] = []

    const updatedCompanions = userCompanions.map((c) => {
      if (!reactorIds.has(c.id)) return c
      const newTasksCompleted = c.tasksCompleted + 1
      const newXP = c.xp + Math.floor(xpGained / 3)
      const newLevel = Math.floor(newXP / 100) + 1
      const leveledUp = newLevel > c.level
      const newBond = Math.min(c.bondLevel + 0.1, c.maxBond)
      const bondLeveled = Math.floor(newBond) > Math.floor(c.bondLevel)

      const updated = {
        ...c,
        xp: newXP,
        level: newLevel,
        tasksCompleted: newTasksCompleted,
        bondLevel: newBond,
        lastMessage: c.lastMessage,
      }

      const aiMsg = messages.find((m) => m.c.id === c.id)?.msg
      if (aiMsg) {
        newSystemMessages.push(`${c.name}: ${aiMsg}`)
        chatUpdates.push({ characterId: c.id, aiMsg })
        updated.lastMessage = aiMsg
      }
      if (leveledUp) {
        newSystemMessages.push(`${c.name}: ${getLevelUpMessage(c, newLevel)}`)
        characterLevelUps.push({ character: updated, level: newLevel })
      }
      if (bondLeveled) {
        newSystemMessages.push(`${c.name}: ${getBondLevelMessage(c, Math.floor(newBond))}`)
        bondLevelUps.push({ character: updated, level: Math.floor(newBond) })
      }

      return updated
    })

    setUserCompanions(updatedCompanions)

    if (newSystemMessages.length > 0) {
      setSystemMessages((p) => [...p, ...newSystemMessages])
    }
    if (chatUpdates.length > 0) {
      const stamp = Date.now()
      setChatHistories((prev) => {
        const next = { ...prev }
        chatUpdates.forEach(({ characterId, aiMsg }, i) => {
          next[characterId] = [
            ...(next[characterId] || []),
            { id: stamp + characterId + i * 2, text: `Completed: ${taskText}`, sender: "user" as const, timestamp: new Date(), type: "system" as const },
            { id: stamp + characterId + i * 2 + 1, text: aiMsg, sender: "character" as const, timestamp: new Date(), type: "text" as const },
          ].slice(-20)
        })
        return next
      })
    }

    const focusCharacter = primaryCharacter || reactors[0] || userCompanions[0]
    const celebrations = buildCelebrations({
      xpGained,
      oldTotalXp,
      newTotalXp,
      oldStreak,
      newStreak,
      oldXpToday,
      newXpToday,
      dailyGoal: dailyGoalForLevel(userLevelForXp(oldTotalXp)),
      focusCharacter,
      characterLevelUps,
      bondLevelUps,
    })
    if (celebrations.length > 0) {
      setCelebrationQueue((prev) => [
        ...prev,
        ...celebrations.map((c) => ({ ...c, key: ++celebrationKeyRef.current })),
      ])
    }
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: enqueue celebrations from handleTaskCompleted"
```

---

## Task 13: Dashboard — inline burst + render ring/badge/overlay

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Fire the inline burst from `toggleTodo`**

Replace the `toggleTodo` function with this version (adds confetti at the checkbox, the floating-XP label, and the pop sound):
```tsx
  const toggleTodo = async (id: number, checkboxEl?: HTMLElement | null) => {
    const todo = todos.find((t) => t.id === id)
    if (!todo || todo.completed) return
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t)),
    )
    const xpGained = Math.floor(todo.xp * xpMultiplier)
    fireConfettiAt(checkboxEl ?? null)
    playSound("pop")
    setFloatingXp({ id, xp: xpGained })
    setTimeout(() => setFloatingXp((cur) => (cur?.id === id ? null : cur)), 800)
    const assigned = todo.assignedCharacterId
      ? userCompanions.find((c) => c.id === todo.assignedCharacterId)
      : undefined
    await handleTaskCompleted(todo.text, todo.category, xpGained, assigned)
  }
```

- [ ] **Step 2: Pass the checkbox element into `toggleTodo`**

Find the task-row `Checkbox` (currently `<Checkbox checked={todo.completed} onCheckedChange={() => toggleTodo(todo.id)} />`) and replace it with a wrapper that captures the element:
```tsx
                            <span
                              ref={(el) => {
                                if (el) (el as HTMLElement & { _row?: number })._row = todo.id
                              }}
                              className="inline-flex"
                            >
                              <Checkbox
                                checked={todo.completed}
                                onCheckedChange={(_, ) => toggleTodo(todo.id, (typeof document !== "undefined" ? document.getElementById(`cb-${todo.id}`) : null))}
                                id={`cb-${todo.id}`}
                              />
                            </span>
```
Simpler, robust version — replace the whole `Checkbox` line with:
```tsx
                            <Checkbox
                              id={`cb-${todo.id}`}
                              checked={todo.completed}
                              onCheckedChange={() =>
                                toggleTodo(
                                  todo.id,
                                  typeof document !== "undefined" ? document.getElementById(`cb-${todo.id}`) : null,
                                )
                              }
                            />
```
Use the simpler version above (the `id` lets `fireConfettiAt` anchor to the checkbox).

- [ ] **Step 3: Render the floating-XP label on the bursting row**

In the task-row container `<div key={todo.id} className="flex items-center gap-3 ...">`, add `relative` to its className and add the floating label as the first child inside it:
```tsx
                          <div
                            key={todo.id}
                            className={`relative flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors ${floatingXp?.id === todo.id ? "animate-task-pop" : ""}`}
                          >
                            {floatingXp?.id === todo.id && (
                              <span className="animate-float-xp pointer-events-none absolute right-10 top-1 text-sm font-bold text-purple-300">
                                +{floatingXp.xp} XP
                              </span>
                            )}
```
(Keep the rest of the row's existing children unchanged.)

- [ ] **Step 4: Fire the burst/sound from `completeDailyQuest`**

Replace `completeDailyQuest` with:
```tsx
  const completeDailyQuest = async (quest: DailyQuest) => {
    setDailyQuests((prev) => prev.map((q) => (q.id === quest.id ? { ...q, completed: true } : q)))
    const xp = Math.floor(quest.xp * xpMultiplier)
    fireConfettiAt(typeof document !== "undefined" ? document.getElementById(`quest-${quest.id}`) : null)
    playSound("pop")
    const character = userCompanions.find((c) => c.id === quest.characterId)
    await handleTaskCompleted(quest.text, quest.category, xp, character)
  }
```
(The `quest-${quest.id}` id is optional; if `components/daily-quests.tsx` doesn't expose it, the confetti simply fires from screen center — acceptable. No change to `daily-quests.tsx` required.)

- [ ] **Step 5: Render the daily-goal ring**

In the dashboard view, inside the left column `<div className="lg:col-span-2 space-y-4">`, add the ring as the first child, before `<DailyQuests ... />`:
```tsx
                <DailyGoalRing
                  xpToday={xpToday}
                  goal={dailyGoalForLevel(userLevelForXp(totalXP))}
                  level={userLevelForXp(totalXP)}
                />
```

- [ ] **Step 6: Render the user-level badge in the header**

In the dashboard header, inside `<div className="flex items-center gap-2 flex-shrink-0">` (the cluster with the Focus button + avatar), add as the first child:
```tsx
                <div className="hidden sm:block">
                  <UserLevelBadge totalXp={totalXP} />
                </div>
```

- [ ] **Step 7: Render the celebration overlay**

Just before the closing of the top-level return — right before the `<FocusTimer ... />` element near the end of the component — add:
```tsx
      <CelebrationOverlay
        celebration={celebrationQueue[0] ?? null}
        onDismiss={() => setCelebrationQueue((prev) => prev.slice(1))}
        playSound={playSound}
      />
```

- [ ] **Step 8: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors. (If `next lint` warns about the `floatingXp` setTimeout cleanup, it is acceptable — the timer self-guards with the `cur?.id === id` check.)

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: wire inline burst, ring, level badge, celebration overlay"
```

---

## Task 14: Profile — sound mute toggle

**Files:**
- Modify: `components/user-profile.tsx`
- Modify: `app/dashboard/page.tsx` (pass props to `UserProfilePanel`)

- [ ] **Step 1: Add sound props to `UserProfile`**

In `components/user-profile.tsx`, add to the `UserProfileProps` interface (after `onSendFeedback`):
```tsx
  soundEnabled: boolean
  onToggleSound: (enabled: boolean) => void
```
Add `soundEnabled, onToggleSound,` to the destructured props in the function signature.

- [ ] **Step 2: Add the Switch import and a Preferences card**

At the top of `components/user-profile.tsx`, add:
```tsx
import { Switch } from "@/components/ui/switch"
```
Add `Volume2` to the existing `lucide-react` import list.

Then, in the JSX, immediately after the "Profile Information" `</Card>` and before the "Subscription Management" card, add:
```tsx
        {/* Preferences */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Volume2 className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Sound effects</p>
                <p className="text-gray-400 text-sm">Play sounds on completions and celebrations.</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={onToggleSound} />
            </div>
          </CardContent>
        </Card>
```

- [ ] **Step 3: Pass the props from the dashboard**

In `app/dashboard/page.tsx`, find the `<UserProfilePanel ... />` render and add these props:
```tsx
            soundEnabled={soundEnabled}
            onToggleSound={(enabled) => setSoundEnabled(enabled)}
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/user-profile.tsx app/dashboard/page.tsx
git commit -m "feat: add sound mute toggle to profile"
```

---

## Task 15: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm run test`
Expected: PASS — all `leveling` and `celebrations` tests green.

- [ ] **Step 2: Type-check and lint the whole project**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors introduced by this work.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`, sign in, and verify:
- Completing a task shows: spring/pop on the row, a floating `+XP`, a confetti burst at the checkbox, a pop sound, and the daily-goal ring ticks up.
- The user-level badge shows the correct level and progress; XP toward the next level advances.
- Earning enough XP to cross the daily goal fires the daily-goal celebration overlay.
- Crossing a streak milestone (3 days) fires the streak celebration.
- A character level-up / bond level-up fires its celebration; multiple simultaneous celebrations play one at a time, ending on the user level-up.
- Toggling "Sound effects" off in Profile silences sounds (visuals still play).
- With OS "reduce motion" enabled, confetti/float animations are suppressed but the app still functions.
- Reloading the page preserves `xpToday` (same day) and resets it on a new day.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: completion-juice + user-levels verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** inline juice (Tasks 10, 13) · daily-goal ring + XP target scaling (Tasks 2, 7, 11, 13) · user level derived from XP (Task 2, 8) · celebration triggers for user-level/char-level/bond/streak/daily-goal (Tasks 3, 9, 12) · queue ordering smallest→biggest (Task 3) · sound with mute toggle (Tasks 5, 14) · reduced-motion handling (Tasks 4, 5, 10) · persisted `xp_today`/`xp_today_date`/`sound_enabled` (Task 6, 11) · day-rollover reset (Task 11) · don't re-fire daily goal (Task 3 crossing check) · StrictMode-safe event build outside updater (Task 12 builds the array before `setCelebrationQueue`). All covered.
- **Refinements vs spec:** sound uses the Web Audio API instead of `/public/sounds` mp3 assets; the celebration overlay is a plain fixed overlay instead of a Radix Dialog. Both preserve spec intent and reduce footprint.
- **Type consistency:** `CompletionResult` (Task 3) uses `characterLevelUps`/`bondLevelUps` arrays and `focusCharacter`; `handleTaskCompleted` (Task 12) populates exactly those names. `Celebration.key` is added at enqueue time (Task 11/12) and consumed by `CelebrationOverlay` (Task 9). `SoundName` (Task 5) is imported by the overlay (Task 9) and dashboard.
