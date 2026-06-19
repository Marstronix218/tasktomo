import { createClient } from "@supabase/supabase-js"
import type { Plan, TaskCategory } from "./types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface CharacterData {
  id: number
  level: number
  xp: number
  tasks_completed: number
}

export interface TaskData {
  task_id: string
  name: string
  category: TaskCategory
  xp_value: number
  status: "completed" | "pending"
  created_at: string
  completed_at?: string
  difficulty?: "Easy" | "Medium" | "Hard"
  recurrence?: "none" | "daily" | "weekly"
  assigned_character_id?: number
  scheduled_date?: string
  order?: number
}

export interface CustomCharacter {
  name: string
  avatar: string
  personality: string
  description: string
  prompt: string
}

export interface Message {
  id: number
  text: string
  sender: "user" | "character"
  timestamp: Date
  type?: "text" | "reward" | "system"
}

export interface DailyQuestRecord {
  id: string
  date: string
  text: string
  category: TaskCategory
  xp: number
  character_id: number
  completed: boolean
}

export interface UserProfile {
  user_id: string
  username: string
  email: string
  plan: Plan
  total_xp: number
  streak_count: number
  message_count?: { [characterId: number]: number }
  crew: CharacterData[]
  bond_levels: { [characterId: number]: number }
  chat_history: { [characterId: number]: Message[] }
  custom_character?: CustomCharacter | null
  tasks: TaskData[]
  last_task_check: string
  last_login?: string
  last_checkin_time?: number
  daily_quests?: DailyQuestRecord[]
  streak_freezes?: number
  focus_minutes_total?: number
  xp_today?: number
  xp_today_date?: string
  daily_goal?: number
  sound_enabled?: boolean
  persona?: string | null
  active_companion_id?: number
  onboarded?: boolean
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan_renews_at?: string | null
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

  if (error) {
    if (error.code === "PGRST116") return null
    console.error("Error fetching user profile:", error)
    return null
  }

  return data
}

export async function upsertUserProfile(profile: UserProfile) {
  const { error } = await supabase.from("user_profiles").upsert(profile, { onConflict: "user_id" })

  if (error) {
    console.error("Error upserting user profile:", error)
    return false
  }

  return true
}

export async function deleteUserProfile(userId: string) {
  const { error } = await supabase.from("user_profiles").delete().eq("user_id", userId)

  if (error) {
    console.error("Error deleting user profile:", error)
    return false
  }

  return true
}
