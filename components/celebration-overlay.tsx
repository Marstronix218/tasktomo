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
