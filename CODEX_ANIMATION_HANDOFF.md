# Codex Handoff — Animated Character Hero (Home view)

**Goal:** Bring the Home-screen companion to life. Replace the static avatar +
`"live animation coming soon"` placeholder in the character hero with the
**full-body character image, gently animated (idle "breathing") and reacting
when the user completes a task.**

This is a continuation of an existing, well-scoped piece of work. Everything you
need is below — file paths, the exact integration points, the conventions to
follow, and a step-by-step plan. **Read the "Conventions & gotchas" section
before writing code.**

---

## Decisions already made (do not re-litigate)

- **Approach: rig a raster PNG, animate with CSS keyframes.** Not 3D, not video,
  not SVG-redraw. The user has provided a full-body PNG and wants it animated.
- **Free / no paid services.** No external APIs, no asset marketplaces.
- **No heavy new dependencies.** The project animates with plain CSS keyframes
  (`tailwindcss-animate` + custom `@keyframes` in `app/globals.css`). Match that.
  `framer-motion` is **optional** and only if you genuinely need spring physics —
  if you add it, use `npm install --legacy-peer-deps framer-motion`. Prefer CSS.
- **Single-image rig for now.** The asset is one flat PNG (not separated limb
  layers), so animate the whole image (bob / scale / squash-stretch). A
  per-limb rig is a future upgrade, out of scope here.
- **Interactive is the whole point.** The character must visibly react to task
  completion — that's the "live home" feature. A static image is not done.

---

## The asset

- `public/mika_fullbody.png` — full-body render of the **Mika** character,
  already in the repo. This is the one character to wire up first.
- Avatars (circular icons) live at `public/<name>.png` (e.g. `/mika.png`).
- Only Mika has a full body so far. The other 9 companions still need full-body
  PNGs (see "Adding more characters" at the end). Your code **must gracefully
  fall back** to the current avatar look for characters with no full body.

---

## Project context

- Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui on Radix.
- `npm install --legacy-peer-deps` is **required** for all installs (React 19 +
  Radix peer conflicts).
- `next.config.mjs` sets `ignoreDuringBuilds` / `ignoreBuildErrors`, so
  **`next build` passes even with type/lint errors.** Validate separately:
  - `npx tsc --noEmit` — NOTE a pre-existing unrelated error in
    `components/ui/calendar.tsx` is **baseline**; ignore only that one.
  - `npm run lint`
  - `npm run test` (vitest, covers `lib/**/*.test.ts` only)
- Dev server: `npm run dev` → http://localhost:3000. The Home view is at
  `/dashboard` (requires a signed-in, onboarded user).

---

## Integration points (exact files)

### 1. `components/character-hero.tsx` — the component to rewrite
Current props:
```ts
interface CharacterHeroProps {
  active: Character | null
  companions: Character[]
  onSelect: (id: number) => void
}
```
It currently renders a circular `<Avatar>` from `active.avatar`, the name/level/
bond, an optional `lastMessage`, the companion switcher row, and a dashed
`"live animation coming soon"` box at the bottom (lines ~51–53). **That dashed
box is the thing you are replacing.** Keep the name/level/bond/lastMessage and
the companion switcher row — only the visual hero area changes.

### 2. `components/home-view.tsx` — renders the hero
Renders `<CharacterHero active={activeCompanion} companions={companions} onSelect={onSelectCompanion} />`
inside the left column (around line 91). If you add a new "reaction" prop to the
hero (recommended, see Step 2), thread it through `HomeViewProps` here.

### 3. `app/dashboard/page.tsx` — the orchestrator & the reaction source
- **`handleTaskCompleted(taskText, category, xpGained, primaryCharacter?)`**
  (around line 403) is the **single XP choke point.** It is called from
  `toggleTodo`, `completeDailyQuest`, and `handleFocusComplete`. **If you fire
  the hero reaction from inside `handleTaskCompleted`, every completion path is
  covered automatically — do it there.**
- Existing juice you can mirror / sit alongside: `floatingXp` state +
  `setFloatingXp(...)`, the `celebrationQueue` consumed by
  `components/celebration-overlay.tsx`, `playSound("pop" | "levelup" | "celebrate")`
  from `hooks/use-sound.ts`, and `fireConfettiAt` / `fireConfettiBurst` from
  `lib/confetti.ts`.
- `active_companion_id` is already persisted and decides which companion the
  hero shows (`activeCompanion`). Don't change that wiring.

### 4. `lib/types.ts` — the `Character` interface
```ts
export interface Character {
  id: number; name: string; avatar: string; level: number;
  personality: string; description: string; bondLevel: number;
  maxBond: number; prompt: string; lastMessage?: string;
  xp: number; tasksCompleted: number;
}
```
There is **no full-body field yet.** Add `fullBody?: string` (optional, so
existing data and the other 9 characters stay valid).

### 5. `lib/characters.ts` — `ALL_CHARACTERS`
Set `fullBody: "/mika_fullbody.png"` on the Mika entry (id/name `"Mika"`). Leave
the others without a `fullBody` for now.

### 6. `app/globals.css` — where keyframes live (follow this pattern)
Existing convention to copy (lines ~96–118):
```css
@keyframes task-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.015); }
  100% { transform: scale(1); }
}
.animate-task-pop { animation: task-pop 300ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .animate-float-xp, .animate-task-pop { animation: none; }
}
```
Add your hero keyframes here and **add their classes to the
`prefers-reduced-motion: reduce` reset** so motion-sensitive users get a static
image.

---

## Step-by-step plan

### Step 1 — Add the full-body field
- `lib/types.ts`: add `fullBody?: string` to `Character`.
- `lib/characters.ts`: set `fullBody: "/mika_fullbody.png"` on Mika.

### Step 2 — Emit a reaction signal from the orchestrator
In `app/dashboard/page.tsx`, add state for a "the character should react now"
pulse. A monotonically increasing nonce is simplest and avoids stale effects:
```ts
const [heroReaction, setHeroReaction] = useState<{ nonce: number; kind: "celebrate" }>({ nonce: 0, kind: "celebrate" })
```
Bump it inside `handleTaskCompleted` (covers todo, quest, and focus completions):
```ts
setHeroReaction((r) => ({ nonce: r.nonce + 1, kind: "celebrate" }))
```
Thread `heroReaction` down: `page.tsx` → `HomeView` prop → `CharacterHero` prop.
Update `HomeViewProps` in `home-view.tsx` accordingly.

### Step 3 — Rewrite the hero visual
In `components/character-hero.tsx`:
- If `active.fullBody` exists, render an `<img src={active.fullBody}>` (or
  `next/image`) anchored to the bottom of the hero panel, sized to fill the
  panel height (`object-contain`, transparent bg), with a soft drop shadow.
- Apply an **idle "breathing" loop** class to the image (always on).
- Add a `useEffect` keyed on `heroReaction.nonce` that adds a **reaction**
  class for ~500ms then removes it (so it can re-trigger on the next task). Skip
  the very first render (`nonce === 0`).
- Optionally call into existing juice: a tiny extra confetti burst or
  `playSound` is already fired by the dashboard on completion, so **don't
  double-fire sound** — the hero only needs the visual pop.
- **Fallback:** if `active.fullBody` is falsy, render the current circular
  `<Avatar>` hero exactly as today (no regression for the other 9 characters).
- Remove the dashed `"live animation coming soon"` placeholder.
- Keep the name + `L{level}` badge, `Bond {…}/{maxBond}`, optional
  `lastMessage`, and the multi-companion switcher row.

### Step 4 — Add the keyframes
In `app/globals.css`, following the existing pattern:
```css
@keyframes hero-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-4px) scale(1.012); }
}
.animate-hero-breathe { animation: hero-breathe 3500ms ease-in-out infinite; }

@keyframes hero-celebrate {
  0%   { transform: translateY(0) scale(1); }
  30%  { transform: translateY(-10px) scale(1.06); }
  55%  { transform: translateY(0) scale(0.97); }
  100% { transform: translateY(0) scale(1); }
}
.animate-hero-celebrate { animation: hero-celebrate 550ms ease-out; }
```
Then extend the reduced-motion block:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-float-xp, .animate-task-pop,
  .animate-hero-breathe, .animate-hero-celebrate { animation: none; }
}
```
(`transform-origin: bottom center` on the image makes the squash-stretch read
as the character planting/hopping rather than floating.)

### Step 5 — Verify (see checklist below).

---

## Animation spec (tuning targets)

- **Idle / breathing:** ~3.5s loop, ease-in-out, infinite. Vertical bob ≤ 4px,
  scale ≤ ~1.012. Subtle — it should feel alive, not bouncy.
- **Reaction (task complete):** ~500–600ms, a single squash-and-stretch hop:
  up + scale-up, then a slight overshoot/settle. Anchored at the feet
  (`transform-origin: bottom center`).
- **Anchoring:** image sits on the floor of the panel (`items-end`), panel keeps
  its `min-h-[220px]` (raise if the full body needs more room — try `min-h-[280px]`).
- **Layering:** keep the name/level/bond text legible; place it above or beside
  the figure, not behind it.

---

## Conventions & gotchas (read before coding)

- **Prefer CSS keyframes over a new animation library.** The codebase has zero
  `framer-motion`/GSAP today; stay consistent.
- **Always guard motion with `prefers-reduced-motion`** — the project does this
  for confetti and the existing juice. Non-negotiable.
- **`handleTaskCompleted` is the single hook** — fire the reaction there, not in
  three separate call sites.
- **Don't double-fire sound/confetti.** The dashboard already plays `"pop"` and
  fires confetti on completion. The hero adds the *visual* reaction only.
- **Build won't catch type errors.** Run `npx tsc --noEmit` and `npm run lint`
  yourself. The lone `components/ui/calendar.tsx` tsc error is pre-existing
  baseline — ignore that one only.
- **Installs need `--legacy-peer-deps`.** Always.
- **Type loosening warning (from CLAUDE.md):** `chat-interface.tsx`,
  `character-selection.tsx`, and `user-profile.tsx` use their own local
  `Character`/`Todo` interfaces. You are **not** touching those — but if you add
  a field to the canonical `Character`, don't try to thread it into those three.
- **No backend/SQL changes.** `fullBody` lives on the static character defs in
  `lib/characters.ts`; it does not need a DB column or a `lib/profile-mapping.ts`
  change. (Companions persist, but `fullBody` can be re-hydrated from
  `ALL_CHARACTERS` by id/name if it ever comes back missing — keep it optional.)

---

## Definition of done

- [ ] Home hero shows the **full-body Mika** image instead of the circular avatar
      (for Mika), with the dashed placeholder gone.
- [ ] The figure has a continuous, subtle **idle breathing** animation.
- [ ] Completing any task (todo checkbox, daily quest, or focus session) triggers
      a visible **reaction hop** on the hero, and it can re-trigger on the next
      completion.
- [ ] Characters **without** a `fullBody` still render the old avatar hero — no
      regression.
- [ ] `prefers-reduced-motion: reduce` disables both hero animations (static image).
- [ ] `npx tsc --noEmit` clean except the known `calendar.tsx` baseline error.
- [ ] `npm run lint` clean; `npm run test` passes.
- [ ] Manually verified at `/dashboard` in the browser.

---

## Out of scope (do not do)

- Video / 3D / WebGL.
- Per-limb rigging or cutting the PNG into layers (future upgrade).
- Generating images (the user supplies full-body PNGs).
- Full-body art for the other 9 characters (just leave the fallback working).
- Any change to auth, Stripe, OpenAI, or the persistence layer.

---

## Adding more characters later (for the user / future work)

For each companion, drop a transparent PNG at `public/<name>_fullbody.png` and
set `fullBody: "/<name>_fullbody.png"` on that character in `lib/characters.ts`.
Best results when the source image is: **full body, straight-on, relaxed idle /
A-pose (arms slightly out), transparent background, high-res, feet at the bottom
edge** so the `transform-origin: bottom center` hop reads correctly.
