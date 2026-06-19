"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Character } from "@/lib/types"

type HeroReaction = { nonce: number; kind: "celebrate" }

interface CharacterHeroProps {
  active: Character | null
  companions: Character[]
  heroReaction?: HeroReaction
  onSelect: (id: number) => void
}

// Per-character animation personalities. Falls back to the calm generic set for
// any full-body character without a bespoke style yet.
function heroAnim(name: string) {
  if (name === "Mika") {
    return {
      sway: "animate-mika-sway",
      idle: "animate-mika-bob",
      reaction: "animate-mika-cheer",
      sparkles: true,
    }
  }
  return { sway: "", idle: "animate-hero-breathe", reaction: "animate-hero-celebrate", sparkles: false }
}

export default function CharacterHero({ active, companions, heroReaction, onSelect }: CharacterHeroProps) {
  const [isReacting, setIsReacting] = useState(false)

  useEffect(() => {
    if (!heroReaction?.nonce || heroReaction.kind !== "celebrate") return

    setIsReacting(false)
    const frame = window.requestAnimationFrame(() => setIsReacting(true))
    const timeout = window.setTimeout(() => setIsReacting(false), 820)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [heroReaction?.kind, heroReaction?.nonce])

  if (!active) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-500 min-h-[220px] flex items-center justify-center">
        Pick a companion to get started.
      </div>
    )
  }

  const companionSwitcher = companions.length > 1 && (
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
  )

  if (active.fullBody) {
    const anim = heroAnim(active.name)
    // Pause the idle loops while the cheer plays so the jump stays clean.
    const swayClass = isReacting ? "" : anim.sway
    const idleClass = isReacting ? "" : anim.idle

    return (
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-purple-950/30 to-gray-900 p-5 flex flex-col items-center text-center relative min-h-[280px] overflow-hidden">
        <div className="relative z-20 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{active.name}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0">L{active.level}</Badge>
          </div>
          <p className="text-[11px] text-gray-400">Bond {Math.floor(active.bondLevel)}/{active.maxBond}</p>
          {active.lastMessage && (
            <p className="text-xs text-gray-400 italic mt-2 line-clamp-2 max-w-xs">"{active.lastMessage}"</p>
          )}
        </div>

        {/* Figure stage — extra headroom above the head so the cheer-jump never clips. */}
        <div className="relative mt-2 flex h-[240px] w-full items-end justify-center overflow-hidden">
          {/* Pulsing ground aura */}
          <div
            className={`pointer-events-none absolute bottom-3 h-12 w-40 rounded-full bg-purple-500/25 blur-xl motion-reduce:animate-none ${anim.sparkles ? "animate-mika-glow" : ""}`}
          />

          {/* Idle twinkles (base opacity-0 → invisible under reduced-motion) */}
          {anim.sparkles && (
            <>
              <span className="pointer-events-none absolute left-6 top-3 text-sm opacity-0 animate-mika-twinkle motion-reduce:animate-none" style={{ animationDelay: "0ms" }}>✨</span>
              <span className="pointer-events-none absolute right-7 top-8 text-xs opacity-0 animate-mika-twinkle motion-reduce:animate-none" style={{ animationDelay: "700ms" }}>⭐</span>
              <span className="pointer-events-none absolute right-12 top-1 text-[10px] opacity-0 animate-mika-twinkle motion-reduce:animate-none" style={{ animationDelay: "1500ms" }}>✨</span>
              <span className="pointer-events-none absolute left-10 top-10 text-[10px] opacity-0 animate-mika-twinkle motion-reduce:animate-none" style={{ animationDelay: "2100ms" }}>✨</span>
            </>
          )}

          {/* Cheer burst */}
          {anim.sparkles && isReacting && (
            <div className="pointer-events-none absolute inset-0 z-20">
              <span className="absolute left-[24%] top-5 text-lg opacity-0 animate-mika-sparkle-burst motion-reduce:animate-none">🌟</span>
              <span className="absolute right-[24%] top-3 text-lg opacity-0 animate-mika-sparkle-burst motion-reduce:animate-none" style={{ animationDelay: "60ms" }}>✨</span>
              <span className="absolute left-[34%] top-0 text-base opacity-0 animate-mika-sparkle-burst motion-reduce:animate-none" style={{ animationDelay: "120ms" }}>💫</span>
              <span className="absolute right-[34%] top-9 text-base opacity-0 animate-mika-sparkle-burst motion-reduce:animate-none" style={{ animationDelay: "30ms" }}>✨</span>
            </div>
          )}

          {/* sway → idle bob → cheer, all anchored at the feet */}
          <div className={`${swayClass} motion-reduce:animate-none`} style={{ transformOrigin: "bottom center" }}>
            <div className={`${idleClass} motion-reduce:animate-none`} style={{ transformOrigin: "bottom center" }}>
              <img
                src={active.fullBody}
                alt={active.name}
                className={`relative z-10 h-[200px] max-h-[34vh] w-auto max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] motion-reduce:animate-none ${isReacting ? anim.reaction : ""}`}
                style={{ transformOrigin: "bottom center" }}
              />
            </div>
          </div>
        </div>

        {companionSwitcher}
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
        <p className="text-xs text-gray-400 italic mt-2 line-clamp-2 max-w-xs">"{active.lastMessage}"</p>
      )}

      {companionSwitcher}
    </div>
  )
}
