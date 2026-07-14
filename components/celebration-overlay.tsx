"use client"

import { useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fireConfettiBurst } from "@/lib/confetti"
import type { Celebration } from "@/lib/celebrations"
import type { SoundName } from "@/hooks/use-sound"

// Non-blocking celebration toast. Celebrations must never own the completion
// moment — the companion reaction does. This auto-dismisses and never blocks input.
const AUTO_DISMISS_MS = 3500

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
    // Auto-advance the queue; each distinct celebration (key changes) restarts the timer.
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration?.key])

  if (!celebration) return null
  const { title, sub } = headline(celebration)

  return (
    <div className="fixed bottom-6 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        onClick={onDismiss}
        className="pointer-events-auto cursor-pointer w-full max-w-sm bg-gray-900/95 border border-purple-500/40 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300"
      >
        {celebration.character && (
          <Avatar className="w-10 h-10 ring-2 ring-purple-500/50 flex-shrink-0">
            <AvatarImage src={celebration.character.avatar} />
            <AvatarFallback>{celebration.character.name[0]}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          <p className="text-xs text-gray-400 truncate">{sub}</p>
        </div>
        <span className="text-purple-300 font-semibold text-sm flex-shrink-0">+{celebration.xpGained} XP</span>
      </div>
    </div>
  )
}
