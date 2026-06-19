"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TASK_CATEGORIES, XP_BY_DIFFICULTY } from "@/lib/types"
import type { Character, Difficulty, TaskCategory, Todo } from "@/lib/types"

interface TaskEditorProps {
  open: boolean
  initial?: Todo | null
  /** Default scheduled day for a brand-new task (yyyy-mm-dd or "" for unscheduled). */
  defaultDate?: string
  companions: Character[]
  onClose: () => void
  onSave: (todo: Todo) => void
  onDelete?: (id: number) => void
}

export default function TaskEditor({ open, initial, defaultDate = "", companions, onClose, onSave, onDelete }: TaskEditorProps) {
  const [text, setText] = useState(initial?.text ?? "")
  const [category, setCategory] = useState<TaskCategory>(initial?.category ?? "General")
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "Easy")
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly">(initial?.recurrence ?? "none")
  const [companionId, setCompanionId] = useState<string>(
    initial?.assignedCharacterId ? String(initial.assignedCharacterId) : companions[0] ? String(companions[0].id) : "",
  )
  const [scheduledDate, setScheduledDate] = useState<string>(initial?.scheduledDate ?? defaultDate)

  if (!open) return null

  const save = () => {
    if (!text.trim()) return
    onSave({
      id: initial?.id ?? Date.now(),
      text: text.trim(),
      completed: initial?.completed ?? false,
      xp: XP_BY_DIFFICULTY[difficulty],
      category,
      difficulty,
      recurrence,
      assignedCharacterId: companionId ? Number(companionId) : undefined,
      scheduledDate: scheduledDate || undefined,
      order: initial?.order,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      completedAt: initial?.completedAt,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-white">{initial ? "Edit task" : "Add task"}</h2>
        <Input
          autoFocus
          placeholder="Task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="bg-gray-800 border-gray-700 text-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Easy">Easy · 10 XP</SelectItem>
              <SelectItem value="Medium">Medium · 20 XP</SelectItem>
              <SelectItem value="Hard">Hard · 30 XP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recurrence} onValueChange={(v) => setRecurrence(v as "none" | "daily" | "weekly")}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">One-time</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={companionId} onValueChange={setCompanionId}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs"><SelectValue placeholder="Companion" /></SelectTrigger>
            <SelectContent>{companions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] text-gray-400">Plan day (leave empty for Unscheduled)</label>
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={save} disabled={!text.trim()} className="bg-purple-600 hover:bg-purple-700 flex-1">
            {initial ? "Save" : "Add"}
          </Button>
          {initial && onDelete && (
            <Button variant="outline" className="text-red-400 border-red-500/50" onClick={() => onDelete(initial.id)}>Delete</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
