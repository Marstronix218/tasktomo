"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Flame, Plus, Send, Timer, Zap, Menu } from "lucide-react"
import Stat from "@/components/stat-card"
import DailyGoalRing from "@/components/daily-goal-ring"
import UserLevelBadge from "@/components/user-level-badge"
import CharacterHero from "@/components/character-hero"
import DailyQuests from "@/components/daily-quests"
import StreakBanner from "@/components/streak-banner"
import type { Character, DailyQuest, Todo } from "@/lib/types"

interface HomeViewProps {
  username: string
  totalXP: number
  streakCount: number
  completedToday: number
  streakFreezes: number
  plan: "Free" | "Premium"
  hoursLeft: number
  onUseFreeze: () => void
  focusMinutesTotal: number
  xpToday: number
  dailyGoal: number
  userLevel: number
  todayTodos: Todo[]
  todosDoneCount: number
  todosTotalCount: number
  dailyQuests: DailyQuest[]
  companions: Character[]
  activeCompanion: Character | null
  onSelectCompanion: (id: number) => void
  onToggleTodo: (id: number, el: HTMLElement | null) => void
  onQuickAdd: (text: string) => void
  onCompleteQuest: (quest: DailyQuest) => void
  onOpenChat: (prefill: string) => void
  onOpenFocus: () => void
  floatingXp: { id: number; xp: number } | null
  setSidebarOpen: (open: boolean) => void
}

export default function HomeView(props: HomeViewProps) {
  const {
    username, totalXP, streakCount, completedToday, streakFreezes, plan, hoursLeft, onUseFreeze,
    focusMinutesTotal, xpToday, dailyGoal, userLevel, todayTodos, todosDoneCount, todosTotalCount,
    dailyQuests, companions, activeCompanion, onSelectCompanion, onToggleTodo, onQuickAdd,
    onCompleteQuest, onOpenChat, onOpenFocus, floatingXp, setSidebarOpen,
  } = props
  const [quickText, setQuickText] = useState("")
  const [chatText, setChatText] = useState("")

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pt-14 lg:pt-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden bg-gray-900 border border-gray-800">
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold truncate">Hi, {username}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block"><UserLevelBadge totalXp={totalXP} /></div>
          <Button onClick={onOpenFocus} variant="outline" size="sm" className="border-purple-500/40 bg-transparent text-white hover:bg-purple-500/10">
            <Timer className="w-4 h-4 mr-1" /> Focus
          </Button>
        </div>
      </div>

      <StreakBanner
        streakCount={streakCount}
        completedToday={completedToday}
        streakFreezes={streakFreezes}
        plan={plan}
        onUseFreeze={onUseFreeze}
        hoursLeftInDay={Math.ceil(hoursLeft)}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-4">
        <Stat icon={<Zap className="w-5 h-5 text-purple-400" />} label="Total XP" value={totalXP.toString()} accent="purple" />
        <Stat icon={<Flame className="w-5 h-5 text-orange-400" />} label="Streak" value={`${streakCount}d`} accent="orange" />
        <Stat icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} label="Today" value={`${todosDoneCount}/${todosTotalCount}`} accent="green" />
        <Stat icon={<Timer className="w-5 h-5 text-blue-400" />} label="Focus" value={`${focusMinutesTotal}m`} accent="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <CharacterHero active={activeCompanion} companions={companions} onSelect={onSelectCompanion} />
          <DailyGoalRing xpToday={xpToday} goal={dailyGoal} level={userLevel} />
        </div>

        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base text-white">
                <span>Today</span>
                <Badge variant="secondary" className="bg-gray-800 text-white">{todosDoneCount}/{todayTodos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add a task for today…"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickText.trim()) { onQuickAdd(quickText.trim()); setQuickText("") }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <Button
                  onClick={() => { if (quickText.trim()) { onQuickAdd(quickText.trim()); setQuickText("") } }}
                  size="sm"
                  disabled={!quickText.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {todayTodos.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-500">Nothing planned for today.</p>
              ) : (
                <div className="space-y-2">
                  {todayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      id={`cb-${todo.id}`}
                      className={`relative flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 ${floatingXp?.id === todo.id ? "animate-task-pop" : ""}`}
                    >
                      {floatingXp?.id === todo.id && (
                        <span className="animate-float-xp pointer-events-none absolute right-10 top-1 text-sm font-bold text-purple-300">
                          +{floatingXp.xp} XP
                        </span>
                      )}
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() =>
                          onToggleTodo(todo.id, typeof document !== "undefined" ? document.getElementById(`cb-${todo.id}`) : null)
                        }
                      />
                      <p className={`flex-1 text-sm ${todo.completed ? "line-through text-gray-500" : "text-white"}`}>{todo.text}</p>
                      <span className="text-[10px] text-purple-400">+{todo.xp} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DailyQuests quests={dailyQuests} companions={companions} onComplete={onCompleteQuest} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Input
          placeholder={activeCompanion ? `Message ${activeCompanion.name}…` : "Message your companion…"}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onOpenChat(chatText); setChatText("") } }}
          className="bg-gray-900 border-gray-800 text-white"
        />
        <Button onClick={() => { onOpenChat(chatText); setChatText("") }} className="bg-purple-600 hover:bg-purple-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
