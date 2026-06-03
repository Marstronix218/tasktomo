import type { Character, DailyQuest, TaskCategory } from "./types"

interface QuestTemplate {
  text: string
  category: TaskCategory
  xp: number
}

const TEMPLATES: QuestTemplate[] = [
  { text: "Drink a full glass of water before doing anything else", category: "Health", xp: 5 },
  { text: "Do 5 minutes of stretching", category: "Health", xp: 8 },
  { text: "Take a 10-minute walk", category: "Health", xp: 10 },
  { text: "Plan tomorrow's top 3 tasks", category: "Personal", xp: 8 },
  { text: "Read 10 pages of something", category: "Study", xp: 10 },
  { text: "Inbox zero on one inbox", category: "Work", xp: 12 },
  { text: "Write down 3 things you're grateful for", category: "Personal", xp: 5 },
  { text: "Tidy your workspace for 5 minutes", category: "Personal", xp: 6 },
  { text: "Practice a skill for 15 minutes", category: "Study", xp: 12 },
  { text: "Send a kind message to someone", category: "Personal", xp: 6 },
  { text: "Review your weekly goals", category: "Work", xp: 10 },
  { text: "No-phone first 30 minutes after waking up", category: "Health", xp: 12 },
  { text: "Cook one home-made meal", category: "Health", xp: 12 },
  { text: "Journal for 5 minutes", category: "Personal", xp: 8 },
  { text: "Reply to that one message you've been avoiding", category: "Personal", xp: 10 },
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function generateDailyQuests(date: string, companions: Character[], count = 3): DailyQuest[] {
  if (companions.length === 0) return []
  const seed = hashString(date)
  const picked: number[] = []
  let i = 0
  while (picked.length < Math.min(count, TEMPLATES.length)) {
    const idx = (seed + i * 7) % TEMPLATES.length
    if (!picked.includes(idx)) picked.push(idx)
    i++
  }
  return picked.map((idx, n) => {
    const tpl = TEMPLATES[idx]
    const character = companions[(seed + n) % companions.length]
    return {
      id: `${date}-${idx}`,
      date,
      text: tpl.text,
      category: tpl.category,
      xp: tpl.xp,
      characterId: character.id,
      completed: false,
    }
  })
}
