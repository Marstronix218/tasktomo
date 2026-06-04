"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Crown,
  Edit,
  Flame,
  Gamepad2,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shuffle,
  Target,
  Timer,
  Trash2,
  User,
  Zap,
} from "lucide-react"

import CharacterSelection from "@/components/character-selection"
import ChatInterface from "@/components/chat-interface"
import DailyQuests from "@/components/daily-quests"
import FocusTimer from "@/components/focus-timer"
import PremiumFeatures from "@/components/premium-features"
import StreakBanner from "@/components/streak-banner"
import UserProfilePanel from "@/components/user-profile"
import CelebrationOverlay from "@/components/celebration-overlay"
import DailyGoalRing from "@/components/daily-goal-ring"
import UserLevelBadge from "@/components/user-level-badge"
import Stat from "@/components/stat-card"
import HomeView from "@/components/home-view"
import WeekPlanner from "@/components/week-planner"
import TaskEditor from "@/components/task-editor"
import { moveToDay } from "@/lib/planner"

import { ALL_CHARACTERS, getAvailableCharacters, getMaxCompanions } from "@/lib/characters"
import { getPersonaPromptHint, type PersonaId } from "@/lib/personas"
import { humanizeReply } from "@/lib/openai"
import {
  getBondLevelMessage,
  getLevelUpMessage,
  getMissedTasksMessage,
  getTaskCompletionMessage,
} from "@/lib/character_reactions"
import { generateDailyQuests } from "@/lib/daily-quests"
import { dailyGoalForLevel, userLevelForXp } from "@/lib/leveling"
import { buildCelebrations, type Celebration } from "@/lib/celebrations"
import { fireConfettiAt } from "@/lib/confetti"
import { useSound } from "@/hooks/use-sound"
import { diffDaysIso, hoursLeftInDay, todayIso } from "@/lib/date-utils"
import {
  chatHistoryFromStored,
  chatHistoryToSerializable,
  companionsToBondLevels,
  companionsToCrew,
  dailyQuestsFromRecords,
  dailyQuestsToRecords,
  hydrateCompanions,
  tasksToTodos,
  todosToTaskData,
} from "@/lib/profile-mapping"
import {
  deleteUserProfile,
  getUserProfile,
  supabase,
  upsertUserProfile,
  type UserProfile as SupabaseUserProfile,
} from "@/lib/supabase"
import type { Character, ChatHistory, ChatMessage, DailyQuest, Difficulty, TaskCategory, Todo } from "@/lib/types"
import { TASK_CATEGORIES, XP_BY_DIFFICULTY } from "@/lib/types"

type View = "home" | "planner" | "chat" | "characters" | "premium" | "profile"

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justUpgraded = searchParams.get("upgraded") === "1"

  const [userId, setUserId] = useState("")
  const [isProfileLoaded, setIsProfileLoaded] = useState(false)
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  const [todos, setTodos] = useState<Todo[]>([])
  const [chatHistories, setChatHistories] = useState<ChatHistory>({})
  const [userCompanions, setUserCompanions] = useState<Character[]>([
    ALL_CHARACTERS[0],
    ALL_CHARACTERS[1],
    ALL_CHARACTERS[2],
  ])
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([])
  const [streakFreezes, setStreakFreezes] = useState(0)
  const [focusMinutesTotal, setFocusMinutesTotal] = useState(0)
  const [xpToday, setXpToday] = useState(0)
  const [xpTodayDate, setXpTodayDate] = useState(todayIso())
  // Daily goal is frozen for the day (set at day-start from the level then) so a
  // mid-day level-up can't move the target — which would otherwise re-fire the
  // "goal reached" celebration and desync the ring.
  const [dailyGoal, setDailyGoal] = useState(50)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [persona, setPersona] = useState<PersonaId | null>(null)
  const [celebrationQueue, setCelebrationQueue] = useState<(Celebration & { key: number })[]>([])
  const [floatingXp, setFloatingXp] = useState<{ id: number; xp: number } | null>(null)
  const celebrationKeyRef = useRef(0)

  const [streakCount, setStreakCount] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [lastTaskCheck, setLastTaskCheck] = useState(todayIso())
  const [lastLogin, setLastLogin] = useState(todayIso())
  const [lastCheckinTime, setLastCheckinTime] = useState(0)
  const [systemMessages, setSystemMessages] = useState<string[]>([])

  const [newTodo, setNewTodo] = useState("")
  const [newTodoCategory, setNewTodoCategory] = useState<TaskCategory>("General")
  const [newTodoDifficulty, setNewTodoDifficulty] = useState<Difficulty>("Easy")
  const [newTodoRecurrence, setNewTodoRecurrence] = useState<"none" | "daily" | "weekly">("none")
  const [newTodoAssignedCharacterId, setNewTodoAssignedCharacterId] = useState<number | "">("")
  const [activeCompanionId, setActiveCompanionId] = useState<number | null>(null)
  const [taskEditorOpen, setTaskEditorOpen] = useState(false)
  const [taskBeingEdited, setTaskBeingEdited] = useState<Todo | null>(null)
  const [chatPrefill, setChatPrefill] = useState("")

  const [currentView, setCurrentView] = useState<View>("home")
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [, forceTick] = useState(0)

  const [userInfo, setUserInfo] = useState({
    username: "User",
    email: "user@example.com",
    plan: "Free" as "Free" | "Premium",
    avatar: "/placeholder.svg?height=40&width=40",
    messageCount: {} as Record<number, number>,
  })

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playSound = useSound(soundEnabled)

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setSidebarOpen(typeof window !== "undefined" && window.innerWidth >= 1024)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (mounted) {
          setIsAuthChecked(true)
          router.replace("/login")
        }
        return
      }
      const uid = session.user.id
      setUserId(uid)
      setUserInfo((p) => ({ ...p, email: session.user.email || p.email }))

      const profile = await getUserProfile(uid)
      if (!profile || !profile.onboarded) {
        router.replace("/onboard")
        return
      }

      const loadedHistory = chatHistoryFromStored(profile.chat_history)
      const loadedTodos = tasksToTodos(profile.tasks)
      const companions = hydrateCompanions(profile, loadedHistory)

      setTodos(loadedTodos)
      setChatHistories(loadedHistory)
      if (companions.length > 0) setUserCompanions(companions)
      setUserInfo((p) => ({
        ...p,
        username: profile.username || p.username,
        email: profile.email || p.email,
        plan: profile.plan || "Free",
        messageCount: profile.message_count || {},
      }))
      setTotalXP(profile.total_xp || 0)
      setStreakCount(profile.streak_count || 0)
      setStreakFreezes(profile.streak_freezes ?? 1)
      setFocusMinutesTotal(profile.focus_minutes_total || 0)
      setSoundEnabled(profile.sound_enabled ?? true)
      setPersona((profile.persona as PersonaId) ?? null)
      setActiveCompanionId(profile.active_companion_id ?? null)
      if (profile.xp_today_date === todayIso()) {
        setXpToday(profile.xp_today || 0)
        setXpTodayDate(profile.xp_today_date)
        setDailyGoal(profile.daily_goal ?? dailyGoalForLevel(userLevelForXp(profile.total_xp || 0)))
      } else {
        setXpToday(0)
        setXpTodayDate(todayIso())
        setDailyGoal(dailyGoalForLevel(userLevelForXp(profile.total_xp || 0)))
      }
      setLastTaskCheck(profile.last_task_check || todayIso())
      setLastLogin(profile.last_login || todayIso())
      setLastCheckinTime(profile.last_checkin_time || 0)
      setDailyQuests(dailyQuestsFromRecords(profile.daily_quests))

      if (mounted) {
        setIsProfileLoaded(true)
        setIsAuthChecked(true)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setUserId("")
        setIsProfileLoaded(false)
        setIsAuthChecked(true)
        router.replace("/login")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (justUpgraded && isProfileLoaded) {
      setSystemMessages((p) => [...p, "System: Welcome to Premium! 🎉 All features unlocked."])
    }
  }, [justUpgraded, isProfileLoaded])

  useEffect(() => {
    if (!isProfileLoaded || !userId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const payload: SupabaseUserProfile = {
        user_id: userId,
        username: userInfo.username,
        email: userInfo.email,
        plan: userInfo.plan,
        total_xp: totalXP,
        streak_count: streakCount,
        crew: companionsToCrew(userCompanions),
        bond_levels: companionsToBondLevels(userCompanions),
        chat_history: chatHistoryToSerializable(chatHistories),
        tasks: todosToTaskData(todos),
        last_task_check: lastTaskCheck,
        message_count: userInfo.messageCount,
        last_login: lastLogin,
        last_checkin_time: lastCheckinTime,
        daily_quests: dailyQuestsToRecords(dailyQuests),
        streak_freezes: streakFreezes,
        focus_minutes_total: focusMinutesTotal,
        xp_today: xpToday,
        xp_today_date: xpTodayDate,
        daily_goal: dailyGoal,
        sound_enabled: soundEnabled,
        persona: persona,
        active_companion_id: activeCompanionId ?? undefined,
        onboarded: true,
      }
      const ok = await upsertUserProfile(payload)
      if (!ok) setSystemMessages((p) => [...p, "System: Failed to sync to Supabase."])
    }, 800)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [
    isProfileLoaded, userId, userInfo, totalXP, streakCount, userCompanions,
    chatHistories, todos, lastTaskCheck, lastLogin, lastCheckinTime, dailyQuests,
    streakFreezes, focusMinutesTotal, xpToday, xpTodayDate, dailyGoal, soundEnabled, persona, activeCompanionId,
  ])

  useEffect(() => {
    if (!isProfileLoaded) return
    const today = todayIso()
    if (lastLogin === today) {
      if (dailyQuests.length === 0 && userCompanions.length > 0) {
        setDailyQuests(generateDailyQuests(today, userCompanions))
      } else if (dailyQuests.length > 0 && dailyQuests[0].date !== today) {
        setDailyQuests(generateDailyQuests(today, userCompanions))
      }
      return
    }
    const daysSince = diffDaysIso(today, lastLogin)
    if (daysSince > 1) {
      if (streakFreezes > 0) {
        setStreakFreezes((n) => n - 1)
        setSystemMessages((p) => [...p, `System: Streak Freeze used — your ${streakCount}-day streak is safe. (${streakFreezes - 1} left)`])
      } else if (streakCount > 0) {
        setStreakCount(0)
        setSystemMessages((p) => [...p, "System: Streak reset. Today's a fresh start 🌱"])
      }
    }
    setTodos((prev) =>
      prev.map((t) =>
        t.recurrence && t.recurrence !== "none" && t.completed
          ? { ...t, completed: false, completedAt: undefined }
          : t,
      ),
    )
    setXpToday(0)
    setXpTodayDate(today)
    setDailyGoal(dailyGoalForLevel(userLevelForXp(totalXP)))
    setDailyQuests(generateDailyQuests(today, userCompanions))
    setLastLogin(today)
  }, [isProfileLoaded, userCompanions])

  useEffect(() => {
    if (!isProfileLoaded) return
    const today = todayIso()
    if (lastTaskCheck === today) return
    const incompleteTasks = todos.filter((t) => !t.completed).length
    if (incompleteTasks >= 3) {
      setUserCompanions((prev) =>
        prev.map((c) => ({ ...c, bondLevel: Math.max(c.bondLevel - 0.3, 0) })),
      )
      userCompanions.forEach((c) => {
        const msg = getMissedTasksMessage(c, incompleteTasks)
        setSystemMessages((p) => [...p, `${c.name}: ${msg}`])
      })
    }
    setLastTaskCheck(today)
  }, [isProfileLoaded, lastTaskCheck, todos, userCompanions])

  const completedTodos = todos.filter((t) => t.completed).length
  const completedToday = useMemo(
    () =>
      todos.filter((t) => t.completed && t.completedAt && t.completedAt.slice(0, 10) === todayIso()).length +
      dailyQuests.filter((q) => q.completed).length,
    [todos, dailyQuests],
  )
  const xpMultiplier = streakCount >= 3 ? Math.min(1 + streakCount / 10, 3) : 1
  const hoursLeft = hoursLeftInDay()
  const availableCharacters = getAvailableCharacters(userInfo.plan)
  const maxCompanions = getMaxCompanions(userInfo.plan)
  const personaHint = getPersonaPromptHint(persona)
  const activeCompanion =
    userCompanions.find((c) => c.id === activeCompanionId) || userCompanions[0] || null
  const todayTodos = useMemo(
    () => todos.filter((t) => t.scheduledDate === todayIso()),
    [todos],
  )

  const generateAITaskMessage = async (character: Character, taskText: string, category: string): Promise<string> => {
    // Rotate through different reaction angles + a random seed so the same task doesn't
    // produce the same canned-sounding line every time.
    const angles = [
      "Celebrate the win with genuine excitement.",
      "Tease them playfully before congratulating.",
      "Tie it back to their bigger goals or growth.",
      "Be proud like a mentor and hint at what's next.",
      "React with surprise and high energy.",
      "Keep it short, punchy and full of personality.",
      "Acknowledge the effort it took, not just the result.",
      "Crack a small joke related to the task.",
    ]
    const angle = angles[Math.floor(Math.random() * angles.length)]
    const personaLine = personaHint ? `\n\n${personaHint}` : ""
    const prompt = `${character.prompt}\n\nThe user "${userInfo.username}" just completed this specific task: "${taskText}" (Category: ${category}). React in your characteristic style. ${angle} Make it personal and specific to THIS task — mention what they actually did ("${taskText}") and why finishing it matters, don't give a generic "good job". Write 2–4 sentences (roughly 40–80 words). Vary your wording, opening, and emojis — never reuse a phrasing you've used before.${personaLine}\n\nWrite like a real person sending a casual text message. Do NOT use any markdown formatting: no asterisks, no bold, no italics, no bullet points, and no dashes for lists. Never use em dashes (—) or en dashes (–); use commas or separate sentences instead. Use plain sentences and emojis only. (seed: ${Math.random().toString(36).slice(2, 8)})`
    try {
      const r = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: prompt }], max_tokens: 220, temperature: 1 }),
      })
      const data = await r.json()
      return (
        humanizeReply(data.choices?.[0]?.message?.content || "") ||
        getTaskCompletionMessage(character, {
          task_id: "0", name: taskText, category: category as TaskCategory,
          xp_value: 10, status: "completed", created_at: new Date().toISOString(),
        })
      )
    } catch {
      return getTaskCompletionMessage(character, {
        task_id: "0", name: taskText, category: category as TaskCategory,
        xp_value: 10, status: "completed", created_at: new Date().toISOString(),
      })
    }
  }

  const handleTaskCompleted = async (
    taskText: string,
    category: string,
    xpGained: number,
    primaryCharacter?: Character,
  ) => {
    const today = todayIso()

    const oldTotalXp = totalXP
    const newTotalXp = totalXP + xpGained
    setTotalXP(newTotalXp)

    const oldStreak = streakCount
    let newStreak = streakCount
    if (lastLogin !== today || completedToday === 0) {
      newStreak = streakCount + 1
      setStreakCount(newStreak)
    }
    setLastLogin(today)

    const oldXpToday = xpTodayDate === today ? xpToday : 0
    const newXpToday = oldXpToday + xpGained
    setXpToday(newXpToday)
    setXpTodayDate(today)

    const reactors = primaryCharacter ? [primaryCharacter] : userCompanions
    const reactorIds = new Set(reactors.map((r) => r.id))
    const messages = await Promise.all(
      reactors.map(async (c) => ({ c, msg: await generateAITaskMessage(c, taskText, category) })),
    )

    const newSystemMessages: string[] = []
    const chatUpdates: { characterId: number; aiMsg: string }[] = []
    const characterLevelUps: { character: Character; level: number }[] = []
    const bondLevelUps: { character: Character; level: number }[] = []

    const updatedCompanions = userCompanions.map((c) => {
      if (!reactorIds.has(c.id)) return c
      const newTasksCompleted = c.tasksCompleted + 1
      const newXP = c.xp + Math.floor(xpGained / 3)
      const newLevel = Math.floor(newXP / 100) + 1
      const leveledUp = newLevel > c.level
      const newBond = Math.min(c.bondLevel + 0.1, c.maxBond)
      const bondLeveled = Math.floor(newBond) > Math.floor(c.bondLevel)

      const updated = {
        ...c,
        xp: newXP,
        level: newLevel,
        tasksCompleted: newTasksCompleted,
        bondLevel: newBond,
        lastMessage: c.lastMessage,
      }

      const aiMsg = messages.find((m) => m.c.id === c.id)?.msg
      if (aiMsg) {
        newSystemMessages.push(`${c.name}: ${aiMsg}`)
        chatUpdates.push({ characterId: c.id, aiMsg })
        updated.lastMessage = aiMsg
      }
      if (leveledUp) {
        newSystemMessages.push(`${c.name}: ${getLevelUpMessage(c, newLevel)}`)
        characterLevelUps.push({ character: updated, level: newLevel })
      }
      if (bondLeveled) {
        newSystemMessages.push(`${c.name}: ${getBondLevelMessage(c, Math.floor(newBond))}`)
        bondLevelUps.push({ character: updated, level: Math.floor(newBond) })
      }

      return updated
    })

    setUserCompanions(updatedCompanions)

    if (newSystemMessages.length > 0) {
      setSystemMessages((p) => [...p, ...newSystemMessages])
    }
    if (chatUpdates.length > 0) {
      const stamp = Date.now()
      setChatHistories((prev) => {
        const next = { ...prev }
        chatUpdates.forEach(({ characterId, aiMsg }, i) => {
          next[characterId] = [
            ...(next[characterId] || []),
            { id: stamp + characterId + i * 2, text: `Completed: ${taskText}`, sender: "user" as const, timestamp: new Date(), type: "system" as const },
            { id: stamp + characterId + i * 2 + 1, text: aiMsg, sender: "character" as const, timestamp: new Date(), type: "text" as const },
          ].slice(-20)
        })
        return next
      })
    }

    const focusCharacter = primaryCharacter || reactors[0] || userCompanions[0]
    const celebrations = buildCelebrations({
      xpGained,
      oldTotalXp,
      newTotalXp,
      oldStreak,
      newStreak,
      oldXpToday,
      newXpToday,
      dailyGoal,
      focusCharacter,
      characterLevelUps,
      bondLevelUps,
    })
    if (celebrations.length > 0) {
      setCelebrationQueue((prev) => [
        ...prev,
        ...celebrations.map((c) => ({ ...c, key: ++celebrationKeyRef.current })),
      ])
    }
  }

  const toggleTodo = async (id: number, checkboxEl?: HTMLElement | null) => {
    const todo = todos.find((t) => t.id === id)
    if (!todo || todo.completed) return
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t)),
    )
    const xpGained = Math.floor(todo.xp * xpMultiplier)
    fireConfettiAt(checkboxEl ?? null)
    playSound("pop")
    setFloatingXp({ id, xp: xpGained })
    setTimeout(() => setFloatingXp((cur) => (cur?.id === id ? null : cur)), 3000)
    const assigned = todo.assignedCharacterId
      ? userCompanions.find((c) => c.id === todo.assignedCharacterId)
      : undefined
    await handleTaskCompleted(todo.text, todo.category, xpGained, assigned)
  }

  const addTodo = (textArg?: string) => {
    const text = (textArg ?? newTodo).trim()
    if (!text || userCompanions.length === 0) return
    const assignedId =
      newTodoAssignedCharacterId === "" ? userCompanions[0].id : (newTodoAssignedCharacterId as number)
    const today = todayIso()
    const todayCount = todos.filter((t) => t.scheduledDate === today).length
    setTodos((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        completed: false,
        xp: XP_BY_DIFFICULTY[newTodoDifficulty],
        category: newTodoCategory,
        difficulty: newTodoDifficulty,
        assignedCharacterId: assignedId,
        recurrence: newTodoRecurrence,
        scheduledDate: today,
        order: todayCount,
        createdAt: new Date().toISOString(),
      },
    ])
    setNewTodo("")
  }

  const deleteTodo = (id: number) => setTodos((prev) => prev.filter((t) => t.id !== id))

  const completeDailyQuest = async (quest: DailyQuest) => {
    setDailyQuests((prev) => prev.map((q) => (q.id === quest.id ? { ...q, completed: true } : q)))
    const xp = Math.floor(quest.xp * xpMultiplier)
    fireConfettiAt(typeof document !== "undefined" ? document.getElementById(`quest-${quest.id}`) : null)
    playSound("pop")
    const character = userCompanions.find((c) => c.id === quest.characterId)
    await handleTaskCompleted(quest.text, quest.category, xp, character)
  }

  const moveTask = (taskId: number, dayIso: string | null, toIndex: number) => {
    setTodos((prev) => moveToDay(prev, taskId, dayIso, toIndex))
  }

  const upsertTask = (task: Todo) => {
    setTodos((prev) => {
      const exists = prev.some((t) => t.id === task.id)
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]
    })
    setTaskEditorOpen(false)
    setTaskBeingEdited(null)
  }

  const openTaskEditor = (todo: Todo | null) => {
    setTaskBeingEdited(todo)
    setTaskEditorOpen(true)
  }

  const openChatFromHome = (prefill: string) => {
    if (!activeCompanion) return
    setChatPrefill(prefill)
    openCharacterChat(activeCompanion)
  }

  const handleFocusComplete = async ({ minutes, xp, taskId, characterId }: { minutes: number; xp: number; taskId?: number; characterId?: number }) => {
    setFocusMinutesTotal((m) => m + minutes)
    const character = characterId ? userCompanions.find((c) => c.id === characterId) : undefined
    const linkedTask = taskId ? todos.find((t) => t.id === taskId) : undefined
    const label = linkedTask ? linkedTask.text : `${minutes}-min focus session`
    await handleTaskCompleted(label, linkedTask?.category || "Work", Math.floor(xp * xpMultiplier), character)
  }

  const useStreakFreezeNow = () => {
    if (streakFreezes <= 0) return
    setStreakFreezes((n) => n - 1)
    setSystemMessages((p) => [...p, `System: Streak Freeze used — streak safe for today.`])
    if (completedToday === 0) setStreakCount((p) => Math.max(p, 1))
  }

  const openCharacterChat = (character: Character) => {
    if (userInfo.plan === "Free") {
      const daily = userInfo.messageCount[character.id] || 0
      if (daily >= 20) {
        setSystemMessages((p) => [...p, `System: Daily message limit reached for ${character.name}. Upgrade for unlimited.`])
        return
      }
    }
    setActiveCharacter(character)
    setCurrentView("chat")
  }

  const backToDashboard = () => {
    setCurrentView("home")
    setActiveCharacter(null)
  }

  const selectCompanions = (next: Character[]) => {
    if (next.length > maxCompanions) {
      setSystemMessages((p) => [...p, `System: ${userInfo.plan} plan allows up to ${maxCompanions} companions.`])
      return
    }
    setUserCompanions(next)
    setCurrentView("home")
  }

  const updateChatHistory = (characterId: number, messages: ChatMessage[]) => {
    setChatHistories((prev) => ({ ...prev, [characterId]: messages.slice(-20) }))
    const lastChar = messages.filter((m) => m.sender === "character").pop()
    if (lastChar) {
      setUserCompanions((prev) =>
        prev.map((c) => (c.id === characterId ? { ...c, lastMessage: lastChar.text } : c)),
      )
    }
    if (userInfo.plan === "Free") {
      const userMsgs = messages.filter((m) => m.sender === "user").length
      setUserInfo((p) => ({ ...p, messageCount: { ...p.messageCount, [characterId]: userMsgs } }))
    }
  }

  const updateBondLevel = (characterId: number, increment: number) => {
    setUserCompanions((prev) =>
      prev.map((c) => (c.id === characterId ? { ...c, bondLevel: Math.min(c.bondLevel + increment, c.maxBond) } : c)),
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  const handleCancelPremium = () => {
    setUserInfo((p) => ({ ...p, plan: "Free" }))
    if (userCompanions.length > 3) setUserCompanions((p) => p.slice(0, 3))
  }

  const handleDeleteAccount = async () => {
    if (userId) await deleteUserProfile(userId)
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const updateUsername = (name: string) => setUserInfo((p) => ({ ...p, username: name }))
  const truncate = (s: string, n = 30) => (s.length > n ? s.substring(0, n) + "..." : s)

  if (!isAuthChecked) return <div className="min-h-screen bg-gray-950 text-white p-6">Checking session...</div>
  if (!isProfileLoaded) return <div className="min-h-screen bg-gray-950 text-white p-6">Loading your workspace...</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {systemMessages.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs sm:max-w-sm">
          {systemMessages.slice(-5).map((message, index) => {
            const parts = message.split(": ")
            const characterName = parts[0]
            const messageText = parts.slice(1).join(": ")
            const character = [...ALL_CHARACTERS, ...userCompanions].find((c) => c.name === characterName)
            // slice(-5) starts at this offset; without the Math.max guard realIdx goes
            // negative when there are fewer than 5 messages and the × button can't match.
            const realIdx = Math.max(0, systemMessages.length - 5) + index
            return (
              <div
                key={realIdx}
                className="bg-gray-900 border border-purple-500/30 text-white p-3 rounded-lg shadow-lg flex items-start gap-3"
              >
                {character && (
                  <Avatar className="w-9 h-9 mt-0.5">
                    <AvatarImage src={character.avatar} />
                    <AvatarFallback className="text-sm">{character.name[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-purple-300">{characterName}</p>
                  <p className="text-sm">{messageText}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSystemMessages((prev) => prev.filter((_, i) => i !== realIdx))}
                  className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-800 flex-shrink-0"
                >
                  ×
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-10 bg-black/60 lg:hidden" />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 p-4 transition-transform duration-300 z-20 w-64 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={backToDashboard}>
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-lg font-bold">TaskCrewAI</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setSidebarOpen(false) }}
            className="ml-auto p-1 lg:hidden"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <nav className="space-y-1 mb-6">
          <Button variant="ghost" className={`w-full justify-start ${currentView === "home" ? "bg-gray-800" : ""}`} onClick={() => setCurrentView("home")}>
            <Target className="w-4 h-4 mr-2" /> Home
          </Button>
          <Button variant="ghost" className={`w-full justify-start ${currentView === "planner" ? "bg-gray-800" : ""}`} onClick={() => setCurrentView("planner")}>
            <CalendarDays className="w-4 h-4 mr-2" /> Planner
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setFocusOpen(true)}>
            <Timer className="w-4 h-4 mr-2" /> Focus timer
          </Button>
          <Button variant="ghost" className={`w-full justify-start ${currentView === "characters" ? "bg-gray-800" : ""}`} onClick={() => setCurrentView("characters")}>
            <Gamepad2 className="w-4 h-4 mr-2" /> Characters
          </Button>
          <Button variant="ghost" className={`w-full justify-start ${currentView === "premium" ? "bg-gray-800" : ""}`} onClick={() => setCurrentView("premium")}>
            <Crown className="w-4 h-4 mr-2" /> Premium
          </Button>
        </nav>

        <div className="mb-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2 px-2">My crew</h3>
          <div className="space-y-2">
            {userCompanions.map((character) => (
              <button
                key={character.id}
                onClick={() => openCharacterChat(character)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeCharacter?.id === character.id ? "bg-gray-800" : "bg-gray-800/40 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={character.avatar} />
                    <AvatarFallback>{character.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{character.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-purple-200 border-purple-500/50 bg-purple-500/10">L{character.level}</Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{character.personality}</p>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Bond {Math.floor(character.bondLevel)}/{character.maxBond}</span>
                  <span>{character.tasksCompleted} tasks</span>
                </div>
                <Progress value={(character.bondLevel / character.maxBond) * 100} className="h-1 bg-purple-950/50 [&>div]:bg-purple-500" />
                {character.lastMessage && (
                  <p className="text-[11px] text-gray-500 italic mt-2 truncate">"{truncate(character.lastMessage)}"</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {userInfo.plan === "Free" && (
          <div className="absolute bottom-4 left-4 right-4">
            <Button onClick={handleUpgrade} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
              <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
            </Button>
          </div>
        )}
      </aside>

      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-10 p-2 lg:hidden bg-gray-900 border border-gray-800 hover:bg-gray-800"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      <div className="lg:ml-64 transition-all duration-300">
        {currentView === "home" ? (
          <HomeView
            username={userInfo.username}
            totalXP={totalXP}
            streakCount={streakCount}
            completedToday={completedToday}
            streakFreezes={streakFreezes}
            plan={userInfo.plan}
            hoursLeft={hoursLeft}
            onUseFreeze={useStreakFreezeNow}
            focusMinutesTotal={focusMinutesTotal}
            xpToday={xpToday}
            dailyGoal={dailyGoal}
            userLevel={userLevelForXp(totalXP)}
            todayTodos={todayTodos}
            todosDoneCount={todayTodos.filter((t) => t.completed).length}
            todosTotalCount={todayTodos.length}
            dailyQuests={dailyQuests}
            companions={userCompanions}
            activeCompanion={activeCompanion}
            onSelectCompanion={(id) => setActiveCompanionId(id)}
            onToggleTodo={toggleTodo}
            onQuickAdd={(text) => addTodo(text)}
            onCompleteQuest={completeDailyQuest}
            onOpenChat={openChatFromHome}
            onOpenFocus={() => setFocusOpen(true)}
            floatingXp={floatingXp}
            setSidebarOpen={setSidebarOpen}
          />
        ) : currentView === "planner" ? (
          <WeekPlanner
            todos={todos}
            companions={userCompanions}
            onMoveTask={moveTask}
            onToggle={toggleTodo}
            onEdit={(todo) => openTaskEditor(todo)}
            onAdd={() => openTaskEditor(null)}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        ) : currentView === "characters" ? (
          <CharacterSelection
            allCharacters={availableCharacters}
            currentCompanions={userCompanions}
            onSelectCompanions={selectCompanions}
            onBack={backToDashboard}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            userPlan={userInfo.plan}
          />
        ) : currentView === "premium" ? (
          <div className="p-6 max-w-4xl mx-auto pt-14 lg:pt-6">
            <h1 className="text-2xl font-bold mb-1">Premium features</h1>
            <p className="text-gray-400 mb-6">Unlock the full potential of TaskCrewAI</p>
            <PremiumFeatures userPlan={userInfo.plan} onUpgrade={handleUpgrade} />
          </div>
        ) : currentView === "profile" ? (
          <UserProfilePanel
            userInfo={userInfo}
            onBack={backToDashboard}
            onUpdateUsername={updateUsername}
            onCancelPremium={handleCancelPremium}
            onDeleteAccount={handleDeleteAccount}
            onSendFeedback={() => setSystemMessages((p) => [...p, "System: Thanks for the feedback!"])}
            soundEnabled={soundEnabled}
            onToggleSound={(enabled) => setSoundEnabled(enabled)}
            persona={persona}
            onUpdatePersona={(p) => setPersona(p)}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        ) : activeCharacter ? (
          <ChatInterface
            character={activeCharacter}
            onBack={backToDashboard}
            chatHistory={chatHistories[activeCharacter.id] || []}
            onUpdateChatHistory={(messages) => updateChatHistory(activeCharacter.id, messages as ChatMessage[])}
            onUpdateBondLevel={(increment) => updateBondLevel(activeCharacter.id, increment)}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            userTasks={todos as any}
            userPlan={userInfo.plan}
            userInfo={userInfo}
            personaHint={personaHint}
            initialDraft={chatPrefill}
          />
        ) : null}
      </div>

      <CelebrationOverlay
        celebration={celebrationQueue[0] ?? null}
        onDismiss={() => setCelebrationQueue((prev) => prev.slice(1))}
        playSound={playSound}
      />
      <TaskEditor
        open={taskEditorOpen}
        initial={taskBeingEdited}
        defaultDate={todayIso()}
        companions={userCompanions}
        onClose={() => { setTaskEditorOpen(false); setTaskBeingEdited(null) }}
        onSave={upsertTask}
        onDelete={(id) => { deleteTodo(id); setTaskEditorOpen(false); setTaskBeingEdited(null) }}
      />
      <FocusTimer
        open={focusOpen}
        onOpenChange={setFocusOpen}
        companions={userCompanions}
        todos={todos}
        onSessionComplete={handleFocusComplete}
        playSound={playSound}
      />
    </div>
  )
}
