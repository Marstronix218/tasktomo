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
