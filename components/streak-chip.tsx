"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Flame, ShieldCheck, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface Props {
  streakCount: number
  completedToday: number
  streakFreezes: number
  plan: "Free" | "Premium"
  onUseFreeze: () => void
  hoursLeftInDay: number
}

export default function StreakChip({
  streakCount,
  completedToday,
  streakFreezes,
  plan,
  onUseFreeze,
  hoursLeftInDay,
}: Props) {
  if (streakCount === 0) return null

  const atRisk = completedToday === 0 && hoursLeftInDay <= 6
  const safe = completedToday > 0

  if (safe && streakCount < 3) return null

  if (atRisk) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-orange-500/50 bg-orange-950/40 px-2.5 py-1 text-xs font-semibold text-orange-200 animate-pulse hover:bg-orange-900/40"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            {streakCount}d at risk
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 border-orange-500/40 bg-gray-900 text-white">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Your {streakCount}-day streak is about to break</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Finish one task in the next {hoursLeftInDay}h to keep it alive.
                {streakFreezes > 0 && " Or burn a Streak Freeze."}
              </p>
              {streakFreezes > 0 ? (
                <Button size="sm" onClick={onUseFreeze} className="mt-3 bg-blue-600 hover:bg-blue-700">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Use freeze ({streakFreezes})
                </Button>
              ) : plan === "Free" ? (
                <Link href="/pricing">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-orange-500/50 bg-transparent text-orange-200 hover:bg-orange-900/20"
                  >
                    Get freezes (Premium)
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  if (streakCount >= 3 && safe) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-gradient-to-r from-orange-900/40 to-yellow-900/30 px-2.5 py-1 text-xs font-semibold text-orange-200 hover:from-orange-900/60 hover:to-yellow-900/50"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              {streakCount}d 🔥
              {streakFreezes > 0 && (
                <span className="flex items-center gap-0.5 text-blue-300">
                  <ShieldCheck className="w-3 h-3" />
                  {streakFreezes}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] border-gray-700 bg-gray-900 text-white">
            <p className="text-xs">
              Streak bonus active — XP boost on every task today.
              {streakFreezes > 0 && ` ${streakFreezes} freeze${streakFreezes > 1 ? "s" : ""} banked.`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return null
}
