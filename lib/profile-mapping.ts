import type { Character, ChatHistory, ChatMessage, DailyQuest, Difficulty, Todo } from "./types"
import { XP_BY_DIFFICULTY } from "./types"
import type { DailyQuestRecord, Message, TaskData, UserProfile } from "./supabase"
import { ALL_CHARACTERS } from "./characters"

export function todosToTaskData(items: Todo[]): TaskData[] {
  return items.map((todo) => ({
    task_id: String(todo.id),
    name: todo.text,
    category: todo.category,
    xp_value: todo.xp,
    status: todo.completed ? "completed" : "pending",
    created_at: todo.createdAt || new Date().toISOString(),
    completed_at: todo.completed ? todo.completedAt || new Date().toISOString() : undefined,
    difficulty: todo.difficulty,
    recurrence: todo.recurrence || "none",
    assigned_character_id: todo.assignedCharacterId,
    scheduled_date: todo.scheduledDate,
    order: todo.order,
  }))
}

export function tasksToTodos(tasks: TaskData[] | undefined): Todo[] {
  if (!tasks || tasks.length === 0) return []
  return tasks.map((task) => {
    const difficulty: Difficulty =
      task.difficulty || (task.xp_value >= 30 ? "Hard" : task.xp_value >= 20 ? "Medium" : "Easy")
    return {
      id: Number(task.task_id) || Date.now() + Math.floor(Math.random() * 1000),
      text: task.name,
      completed: task.status === "completed",
      xp: task.xp_value || XP_BY_DIFFICULTY[difficulty],
      category: task.category,
      difficulty,
      assignedCharacterId: task.assigned_character_id,
      recurrence: task.recurrence,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      scheduledDate: task.scheduled_date,
      order: task.order,
    }
  })
}

export function companionsToCrew(companions: Character[]) {
  return companions.map((c) => ({
    id: c.id,
    level: c.level,
    xp: c.xp,
    tasks_completed: c.tasksCompleted,
  }))
}

export function companionsToBondLevels(companions: Character[]): { [id: number]: number } {
  return companions.reduce(
    (acc, c) => {
      acc[c.id] = c.bondLevel
      return acc
    },
    {} as { [id: number]: number },
  )
}

export function chatHistoryToSerializable(history: ChatHistory): { [id: number]: Message[] } {
  const out: { [id: number]: Message[] } = {}
  Object.entries(history).forEach(([id, msgs]) => {
    out[Number(id)] = (msgs || []).map((m) => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp as any),
    }))
  })
  return out
}

export function chatHistoryFromStored(history: UserProfile["chat_history"] | undefined): ChatHistory {
  const out: ChatHistory = {}
  if (!history) return out
  Object.entries(history).forEach(([id, msgs]) => {
    const arr = Array.isArray(msgs) ? (msgs as Message[]) : []
    out[Number(id)] = arr.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })) as ChatMessage[]
  })
  return out
}

export function hydrateCompanions(profile: UserProfile, loadedHistory: ChatHistory): Character[] {
  const ids = profile.crew?.map((m) => m.id) || []
  if (ids.length === 0) return []
  return ids
    .map((id): Character | null => {
      const base = ALL_CHARACTERS.find((c) => c.id === id)
      const progress = profile.crew.find((m) => m.id === id)
      if (!base || !progress) return null
      const lastCharMsg = (loadedHistory[id] || []).filter((m) => m.sender === "character").pop()
      return {
        ...base,
        level: progress.level,
        xp: progress.xp,
        tasksCompleted: progress.tasks_completed,
        bondLevel: profile.bond_levels?.[id] || 0,
        lastMessage: lastCharMsg?.text || "",
      }
    })
    .filter((c): c is Character => c !== null)
}

export function dailyQuestsToRecords(quests: DailyQuest[]): DailyQuestRecord[] {
  return quests.map((q) => ({
    id: q.id,
    date: q.date,
    text: q.text,
    category: q.category,
    xp: q.xp,
    character_id: q.characterId,
    completed: q.completed,
  }))
}

export function dailyQuestsFromRecords(records: DailyQuestRecord[] | undefined): DailyQuest[] {
  if (!records) return []
  return records.map((r) => ({
    id: r.id,
    date: r.date,
    text: r.text,
    category: r.category,
    xp: r.xp,
    characterId: r.character_id,
    completed: r.completed,
  }))
}
