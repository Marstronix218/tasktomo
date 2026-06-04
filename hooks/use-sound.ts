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
