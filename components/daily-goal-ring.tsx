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
