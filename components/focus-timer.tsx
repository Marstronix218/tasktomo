"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Timer, Pause, Play, Square, Zap } from "lucide-react"
import type { Character, Todo } from "@/lib/types"
import type { SoundName } from "@/hooks/use-sound"

const PRESETS = [
  { label: "15 min · Sprint", minutes: 15, xp: 15 },
  { label: "25 min · Pomodoro", minutes: 25, xp: 25 },
  { label: "45 min · Deep work", minutes: 45, xp: 45 },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  companions: Character[]
  todos: Todo[]
  onSessionComplete: (params: { minutes: number; xp: number; taskId?: number; characterId?: number }) => void
  playSound?: (name: SoundName) => void
}

export default function FocusTimer({ open, onOpenChange, companions, todos, onSessionComplete, playSound }: Props) {
  const [preset, setPreset] = useState(PRESETS[1])
  const [customMinutes, setCustomMinutes] = useState(30)
  const isCustom = preset.label === "Custom"
  const [taskId, setTaskId] = useState<number | "">("")
  const [characterId, setCharacterId] = useState<number | "">(companions[0]?.id ?? "")
  const [remaining, setRemaining] = useState(preset.minutes * 60)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!running) {
      setRemaining(preset.minutes * 60)
    }
  }, [preset, running])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (!completedRef.current) {
            completedRef.current = true
            setRunning(false)
            setCompleted(true)
            playSound?.("celebrate")
            onSessionComplete({
              minutes: preset.minutes,
              xp: preset.xp,
              taskId: typeof taskId === "number" ? taskId : undefined,
              characterId: typeof characterId === "number" ? characterId : undefined,
            })
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, preset, taskId, characterId, onSessionComplete, playSound])

  const start = () => {
    completedRef.current = false
    setCompleted(false)
    setRunning(true)
    startedAtRef.current = Date.now()
    playSound?.("pop")
  }
  const pause = () => setRunning(false)
  const selectCustom = () => setPreset({ label: "Custom", minutes: customMinutes, xp: customMinutes })
  const onCustomChange = (value: string) => {
    const m = Math.max(1, Math.min(180, Math.floor(Number(value) || 0)))
    setCustomMinutes(m)
    setPreset({ label: "Custom", minutes: m, xp: m })
  }
  const stop = () => {
    setRunning(false)
    setRemaining(preset.minutes * 60)
    completedRef.current = false
    setCompleted(false)
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const pct = ((preset.minutes * 60 - remaining) / (preset.minutes * 60)) * 100
  const pickedChar = companions.find((c) => c.id === characterId)
  const pickedTask = todos.find((t) => t.id === taskId)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && running) return
        onOpenChange(o)
      }}
    >
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-purple-400" />
            Focus session
          </DialogTitle>
        </DialogHeader>

        {!running && !completed && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p)}
                  className={`p-3 rounded-lg border text-left text-xs transition ${
                    preset.label === p.label
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                  }`}
                >
                  <div className="font-semibold text-white text-sm">{p.minutes}m</div>
                  <div className="text-gray-400 text-[10px] mt-0.5">+{p.xp} XP</div>
                </button>
              ))}
              <button
                onClick={selectCustom}
                className={`p-3 rounded-lg border text-left text-xs transition ${
                  isCustom
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                }`}
              >
                <div className="font-semibold text-white text-sm">Custom</div>
                <div className="text-gray-400 text-[10px] mt-0.5">Your time</div>
              </button>
            </div>

            {isCustom && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Custom length (1–180 min)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  onChange={(e) => onCustomChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-2 text-sm text-white"
                />
                <p className="text-[10px] text-gray-500 mt-1">Earns +{customMinutes} XP on completion.</p>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Working on (optional)</label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-2 text-sm text-white"
              >
                <option value="">— No specific task —</option>
                {todos.filter((t) => !t.completed).map((t) => (
                  <option key={t.id} value={t.id}>{t.text}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Companion cheering</label>
              <div className="flex gap-2 flex-wrap">
                {companions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCharacterId(c.id)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs transition ${
                      characterId === c.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback>{c.name[0]}</AvatarFallback>
                    </Avatar>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={start} className="w-full bg-purple-600 hover:bg-purple-700">
              <Play className="w-4 h-4 mr-2" /> Start {preset.minutes}-minute session
            </Button>
          </div>
        )}

        {running && (
          <div className="space-y-4 text-center">
            <div className="text-6xl font-bold tabular-nums tracking-tight">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            <Progress value={pct} className="h-2" />
            {pickedTask && (
              <p className="text-sm text-gray-300 truncate">📌 {pickedTask.text}</p>
            )}
            {pickedChar && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={pickedChar.avatar} />
                  <AvatarFallback>{pickedChar.name[0]}</AvatarFallback>
                </Avatar>
                {pickedChar.name} is rooting for you
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={pause} className="border-gray-700 bg-transparent text-white">
                <Pause className="w-4 h-4 mr-1" /> Pause
              </Button>
              <Button variant="outline" onClick={stop} className="border-red-900/50 bg-transparent text-red-300 hover:bg-red-500/10">
                <Square className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
            <p className="text-[10px] text-gray-600">Leaving this page cancels the session. Stay focused 💪</p>
          </div>
        )}

        {!running && completed && (
          <div className="space-y-4 text-center py-2">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <Zap className="w-3 h-3 mr-1" /> +{preset.xp} XP earned
            </Badge>
            <h3 className="text-xl font-bold">{preset.minutes}-minute session done 🎉</h3>
            <p className="text-sm text-gray-400">Your crew is celebrating. Take a 5-min break before the next one.</p>
            <Button onClick={() => { setCompleted(false); setRemaining(preset.minutes * 60) }} className="w-full bg-purple-600 hover:bg-purple-700">
              Start another
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
