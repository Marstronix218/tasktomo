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
