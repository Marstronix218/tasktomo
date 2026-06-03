"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Check, ArrowRight, Crown } from "lucide-react"
import { ALL_CHARACTERS, FREE_PLAN_CHARACTER_LIMIT, FREE_PLAN_MAX_COMPANIONS } from "@/lib/characters"
import { supabase, upsertUserProfile, getUserProfile } from "@/lib/supabase"
import type { Character } from "@/lib/types"

const STEPS = ["Welcome", "Name", "Crew", "Done"] as const

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [selected, setSelected] = useState<Character[]>([])
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      if (!session?.user) {
        router.replace("/login")
        return
      }
      setUserId(session.user.id)
      setEmail(session.user.email || "")
      setUsername(session.user.email?.split("@")[0] || `User${Math.floor(Math.random() * 10000)}`)
      const existing = await getUserProfile(session.user.id)
      if (existing?.onboarded) {
        router.replace("/dashboard")
        return
      }
      setChecking(false)
    })()
    return () => { active = false }
  }, [router])

  const toggle = (c: Character) => {
    setSelected((s) =>
      s.find((x) => x.id === c.id)
        ? s.filter((x) => x.id !== c.id)
        : s.length >= FREE_PLAN_MAX_COMPANIONS
          ? s
          : [...s, c],
    )
  }

  const finish = async () => {
    setSaving(true)
    const today = new Date().toDateString()
    await upsertUserProfile({
      user_id: userId,
      username: username.trim() || `User${Math.floor(Math.random() * 10000)}`,
      email,
      plan: "Free",
      total_xp: 0,
      streak_count: 0,
      crew: selected.map((c) => ({ id: c.id, level: 1, xp: 0, tasks_completed: 0 })),
      bond_levels: selected.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {}),
      chat_history: {},
      tasks: [],
      last_task_check: today,
      last_login: today,
      message_count: {},
      onboarded: true,
      streak_freezes: 1,
    })
    router.replace("/dashboard")
  }

  if (checking) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i < step ? "bg-green-500/30 text-green-300" : i === step ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-500"
                }`}
              >
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-green-500/40" : "bg-gray-800"}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center space-y-4">
              <h1 className="text-3xl font-bold">Welcome aboard 👋</h1>
              <p className="text-gray-400 max-w-md mx-auto">
                In 60 seconds, you'll have a crew of AI companions and a working productivity system.
                Three quick steps.
              </p>
              <Button size="lg" onClick={() => setStep(1)} className="bg-purple-600 hover:bg-purple-700">
                Let's go <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 space-y-4">
              <h2 className="text-2xl font-bold">What should your crew call you?</h2>
              <p className="text-sm text-gray-400">They'll use this when they cheer you on, roast you, etc.</p>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name or handle"
                className="bg-gray-800 border-gray-700 text-white text-lg"
                maxLength={32}
                autoFocus
              />
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(0)} className="text-gray-300">Back</Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!username.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Pick your starting crew</h2>
                <p className="text-sm text-gray-400">
                  Choose up to {FREE_PLAN_MAX_COMPANIONS}. You can swap them later.
                  <span className="block text-xs text-yellow-400 mt-1">
                    <Crown className="w-3 h-3 inline mr-1" />
                    Free plan: first {FREE_PLAN_CHARACTER_LIMIT} characters. Premium unlocks all 10.
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ALL_CHARACTERS.map((c, i) => {
                  const locked = i >= FREE_PLAN_CHARACTER_LIMIT
                  const isSelected = !!selected.find((x) => x.id === c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => !locked && toggle(c)}
                      disabled={locked}
                      className={`relative p-3 rounded-xl border text-left transition ${
                        locked
                          ? "border-gray-800 opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-800 bg-gray-800/40 hover:border-gray-700"
                      }`}
                    >
                      {locked && (
                        <Badge className="absolute top-1 right-1 bg-yellow-500/30 text-yellow-200 border-yellow-500/40 text-[9px] px-1 py-0">
                          <Crown className="w-2.5 h-2.5" />
                        </Badge>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <Avatar className="w-12 h-12 mx-auto mb-2">
                        <AvatarImage src={c.avatar} />
                        <AvatarFallback>{c.name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-white text-center truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400 text-center mt-0.5 line-clamp-2">{c.personality}</p>
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-gray-300">Back</Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={selected.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {selected.length === 0 ? "Pick at least one" : `Continue with ${selected.length}`}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center space-y-5">
              <h2 className="text-2xl font-bold">You're set, {username} 🎉</h2>
              <div className="flex justify-center gap-2 flex-wrap">
                {selected.map((c) => (
                  <div key={c.id} className="flex flex-col items-center">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback>{c.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs mt-1">{c.name}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400">
                Your crew is ready. We've also added a <strong className="text-blue-300">Streak Freeze</strong> to your inventory —
                use it on a bad day to keep your streak alive.
              </p>
              <Button size="lg" onClick={finish} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving ? "Setting up..." : "Open my dashboard"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
