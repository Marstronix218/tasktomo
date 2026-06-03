"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles } from "lucide-react"
import type { Character, DailyQuest } from "@/lib/types"

interface Props {
  quests: DailyQuest[]
  companions: Character[]
  onComplete: (quest: DailyQuest) => void
}

export default function DailyQuests({ quests, companions, onComplete }: Props) {
  if (quests.length === 0) return null
  const remaining = quests.filter((q) => !q.completed).length
  return (
    <Card className="bg-gray-900 border border-purple-500/50 ring-1 ring-purple-500/20 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Daily quests
          <Badge variant="outline" className="ml-auto border-purple-500/40 text-purple-300 text-[10px]">
            {quests.length - remaining}/{quests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {quests.map((q) => {
          const character = companions.find((c) => c.id === q.characterId)
          return (
            <div
              key={q.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                q.completed ? "bg-green-900/20" : "bg-gray-800/50 hover:bg-gray-800"
              } transition-colors`}
            >
              <Checkbox
                checked={q.completed}
                onCheckedChange={() => !q.completed && onComplete(q)}
                disabled={q.completed}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${q.completed ? "line-through text-gray-500" : "text-white"}`}>
                  {q.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] text-gray-300 border-gray-600 px-1.5 py-0">
                    {q.category}
                  </Badge>
                  <span className="text-[10px] text-purple-300">+{q.xp} XP</span>
                </div>
              </div>
              {character && (
                <Avatar className="w-6 h-6">
                  <AvatarImage src={character.avatar} />
                  <AvatarFallback className="text-[10px]">{character.name[0]}</AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
