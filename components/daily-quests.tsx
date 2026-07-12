"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Plus, Sparkles, Trash2 } from "lucide-react"
import type { Character, DailyQuest, TaskCategory } from "@/lib/types"
import { TASK_CATEGORIES } from "@/lib/types"

interface Props {
  quests: DailyQuest[]
  companions: Character[]
  onComplete: (quest: DailyQuest) => void
  onAdd: (text: string, category: TaskCategory) => void
  onUpdateText: (id: string, text: string) => void
  onRemove: (id: string) => void
}

export default function DailyQuests({ quests, companions, onComplete, onAdd, onUpdateText, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState("")
  const [newCategory, setNewCategory] = useState<TaskCategory>("Personal")

  if (quests.length === 0) return null
  const visible = quests.filter((q) => !q.hidden)
  const done = visible.filter((q) => q.completed).length

  const submitNew = () => {
    if (!newText.trim()) return
    onAdd(newText, newCategory)
    setNewText("")
    setAdding(false)
  }

  return (
    <Card className="bg-gray-900 border border-purple-500/50 ring-1 ring-purple-500/20 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Daily quests
          <Badge variant="outline" className="ml-auto border-purple-500/40 text-purple-300 text-[10px]">
            {done}/{visible.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {visible.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">No quests today — add your own below.</p>
        )}
        {visible.map((q) => {
          const character = companions.find((c) => c.id === q.characterId)
          return (
            <div
              key={q.id}
              className={`group flex items-center gap-3 p-2 rounded-lg ${
                q.completed ? "bg-green-900/20" : "bg-gray-800/50 hover:bg-gray-800"
              } transition-colors`}
            >
              <Checkbox
                checked={q.completed}
                onCheckedChange={() => !q.completed && onComplete(q)}
                disabled={q.completed}
              />
              <div className="flex-1 min-w-0">
                {editingId === q.id ? (
                  <Input
                    value={q.text}
                    onChange={(e) => onUpdateText(q.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                    className="bg-gray-700 border-gray-600 text-white text-sm h-8"
                    autoFocus
                  />
                ) : (
                  <>
                    <p className={`text-sm ${q.completed ? "line-through text-gray-500" : "text-white"}`}>
                      {q.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] text-gray-300 border-gray-600 px-1.5 py-0">
                        {q.category}
                      </Badge>
                      <span className="text-[10px] text-purple-300">+{q.xp} XP</span>
                      {q.custom && (
                        <Badge variant="outline" className="text-[10px] text-blue-300 border-blue-700/50 px-1.5 py-0">
                          yours
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
              {!q.completed && editingId !== q.id && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(q.id)} className="p-1 h-7 w-7">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onRemove(q.id)} className="p-1 h-7 w-7 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              {character && (
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={character.avatar} />
                  <AvatarFallback className="text-[10px]">{character.name[0]}</AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })}

        {adding ? (
          <div className="flex gap-2 items-center pt-1">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
              placeholder="Your quest for today..."
              className="bg-gray-800 border-gray-700 text-white text-sm h-8 flex-1"
              autoFocus
            />
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v as TaskCategory)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={submitNew} disabled={!newText.trim()} className="h-8 bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            className="w-full text-gray-400 hover:text-white hover:bg-gray-800 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add your own quest (+10 XP)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
