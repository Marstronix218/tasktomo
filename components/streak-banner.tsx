"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

export default function StreakBanner({
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
      <Card className="bg-gradient-to-r from-orange-900/40 to-red-900/30 border-orange-500/40 text-orange-100 mb-6">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-100">
              Your {streakCount}-day streak is about to break
            </p>
            <p className="text-xs text-orange-200/80">
              Finish one task in the next {hoursLeftInDay}h to keep it alive.
              {streakFreezes > 0 && " Or burn a Streak Freeze."}
            </p>
          </div>
          {streakFreezes > 0 ? (
            <Button size="sm" onClick={onUseFreeze} className="bg-blue-600 hover:bg-blue-700">
              <ShieldCheck className="w-4 h-4 mr-1" /> Use freeze ({streakFreezes})
            </Button>
          ) : plan === "Free" ? (
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-200 bg-transparent hover:bg-orange-500/10">
                Get freezes (Premium)
              </Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  if (streakCount >= 3 && safe) {
    return (
      <Card className="bg-gradient-to-r from-orange-900/30 to-yellow-900/20 border-orange-500/30 text-orange-100 mb-6">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Flame className="w-5 h-5 text-orange-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-100">
              {streakCount}-day streak locked in 🔥
            </p>
            <p className="text-xs text-orange-200/80">
              Streak bonus active — XP boost on every task today.
            </p>
          </div>
          {streakFreezes > 0 && (
            <Badge variant="outline" className="border-blue-500/40 text-blue-300">
              <ShieldCheck className="w-3 h-3 mr-1" /> {streakFreezes} freeze{streakFreezes > 1 ? "s" : ""}
            </Badge>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}
