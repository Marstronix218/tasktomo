"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Character } from "@/lib/types"

interface NextStepNudgeProps {
  character: Character
  message: string
  onPlan: (text: string) => void
  onDismiss: () => void
}

// Post-completion planning nudge: the companion asks for tomorrow's one thing and the
// user can create it in one tap. Inline banner — never a modal, never blocks the page.
export default function NextStepNudge({ character, message, onPlan, onDismiss }: NextStepNudgeProps) {
  const [text, setText] = useState("")

  const plan = () => {
    if (!text.trim()) return
    onPlan(text.trim())
  }

  return (
    <div className="bg-gray-900 border border-purple-500/40 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-purple-500/50 flex-shrink-0">
          <AvatarImage src={character.avatar} />
          <AvatarFallback>{character.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-purple-300 mb-0.5">{character.name}</p>
          <p className="text-sm text-white">{message}</p>
          <div className="flex gap-2 mt-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && plan()}
              placeholder="Tomorrow's one thing..."
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-9"
            />
            <Button
              onClick={plan}
              disabled={!text.trim()}
              className="h-9 flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
            >
              Plan it
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-800 flex-shrink-0"
        >
          ×
        </Button>
      </div>
    </div>
  )
}
