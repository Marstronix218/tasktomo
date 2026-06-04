export type Difficulty = "Easy" | "Medium" | "Hard"

export type TaskCategory = "Health" | "Work" | "Study" | "Personal" | "General"

export type Plan = "Free" | "Premium"

export interface Todo {
  id: number
  text: string
  completed: boolean
  xp: number
  category: TaskCategory
  difficulty: Difficulty
  assignedCharacterId?: number
  recurrence?: "none" | "daily" | "weekly"
  scheduledDate?: string
  order?: number
  dueDate?: string
  createdAt?: string
  completedAt?: string
}

export interface Character {
  id: number
  name: string
  avatar: string
  level: number
  personality: string
  description: string
  bondLevel: number
  maxBond: number
  prompt: string
  lastMessage?: string
  xp: number
  tasksCompleted: number
}

export interface ChatMessage {
  id: number
  text: string
  sender: "user" | "character"
  timestamp: Date
  type?: "text" | "reward" | "system"
}

export type ChatHistory = { [characterId: number]: ChatMessage[] }

export interface FocusSession {
  startedAt: string
  endedAt?: string
  durationMinutes: number
  taskId?: number
  characterId?: number
  completed: boolean
  xpAwarded: number
}

export interface DailyQuest {
  id: string
  date: string
  text: string
  category: TaskCategory
  xp: number
  characterId: number
  completed: boolean
}

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  Easy: 10,
  Medium: 20,
  Hard: 30,
}

export const TASK_CATEGORIES: TaskCategory[] = ["General", "Work", "Study", "Health", "Personal"]
