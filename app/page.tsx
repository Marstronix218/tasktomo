"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ALL_CHARACTERS } from "@/lib/characters"
import { supabase } from "@/lib/supabase"
import {
  ArrowRight,
  Flame,
  Sparkles,
  Target,
  Trophy,
  Zap,
  CheckCircle2,
  MessageCircle,
  Heart,
  Crown,
  Timer,
  Repeat,
  Bell,
  Calendar,
} from "lucide-react"

const FEATURES = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "10 AI companions, each with a personality",
    body: "Tsundere rival, lazy genius, sadistic coach, yandere — pick the energy that actually keeps you working.",
  },
  {
    icon: <Timer className="w-5 h-5" />,
    title: "Focus timer with XP rewards",
    body: "Pomodoro sessions that hook into the gamification. Finish the timer, your companions celebrate, your streak grows.",
  },
  {
    icon: <Repeat className="w-5 h-5" />,
    title: "Recurring tasks & daily quests",
    body: "Companions generate fresh quests for you each day. Habits that compound without the spreadsheet.",
  },
  {
    icon: <Flame className="w-5 h-5" />,
    title: "Streaks that actually feel alive",
    body: "Miss a day and your bond drops. Hit your streak and the XP multiplier stacks up to 3×. Streak Freezes save bad days.",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Smart check-ins, not nag notifications",
    body: "Your crew DMs you in-character at the right moments. No generic 'don't break your streak!' spam.",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: "Bond levels & weekly review",
    body: "Watch each companion level up with you. Sunday review shows what you actually shipped — not just what you opened.",
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session?.user) {
        router.replace("/dashboard")
      } else {
        setChecking(false)
      }
    })
    return () => {
      active = false
    }
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur bg-gray-950/80 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="TaskCrewAI" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg">TaskCrewAI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/pricing" className="text-sm text-gray-300 hover:text-white px-2 py-1">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-gray-300 hover:text-white px-2 py-1">
              Sign in
            </Link>
            <Link href="/login?signup=1">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/40 mb-5">
              <Sparkles className="w-3 h-3 mr-1" /> AI productivity, but actually fun
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Your to‑do list, <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                with a crew that cares.
              </span>
            </h1>
            <p className="mt-5 text-lg text-gray-300 leading-relaxed max-w-xl">
              Pick from 10 AI companions with real personalities. They cheer you on, roast you when you slack,
              and grow with you as you ship. Streaks, XP, focus timers, daily quests — productivity that feels
              like a game you actually want to win.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/login?signup=1">
                <Button size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
                  Start free — pick your crew <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-700 text-white bg-transparent">
                  See pricing
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Free forever for 5 characters · No credit card required
            </p>
          </div>

          {/* Character lineup preview */}
          <div className="relative">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {ALL_CHARACTERS.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-purple-500/50 transition-colors"
                >
                  <Avatar className="w-12 h-12 mx-auto mb-2">
                    <AvatarImage src={c.avatar} />
                    <AvatarFallback>{c.name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium text-center text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-500 text-center truncate">{c.personality}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
              {ALL_CHARACTERS.slice(5, 10).map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3 opacity-90 hover:opacity-100 hover:border-pink-500/50 transition-all"
                >
                  <Avatar className="w-12 h-12 mx-auto mb-2">
                    <AvatarImage src={c.avatar} />
                    <AvatarFallback>{c.name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium text-center text-white truncate">{c.name}</p>
                  <div className="flex justify-center mt-1">
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[9px] px-1.5 py-0">
                      <Crown className="w-2 h-2 mr-0.5" /> Premium
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Social proof teaser */}
      <section className="border-y border-gray-800 bg-gray-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Stat icon={<Zap className="w-4 h-4" />} value="3×" label="Max XP streak multiplier" />
          <Stat icon={<Target className="w-4 h-4" />} value="10" label="AI companions" />
          <Stat icon={<Timer className="w-4 h-4" />} value="∞" label="Focus sessions (Free)" />
          <Stat icon={<Heart className="w-4 h-4" />} value="10" label="Bond levels per crew" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Why people actually stick with it</h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Most productivity apps are dashboards. This one is a relationship.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="bg-gray-900 border-gray-800 hover:border-purple-500/40 transition-colors">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Step n={1} title="Pick your crew" body="Choose up to 3 companions from 5 free personalities. Premium unlocks the full 10 and lets you create custom ones." />
            <Step n={2} title="Add tasks & focus" body="Assign tasks to a companion, set difficulty, run a focus timer. Easy/Medium/Hard maps to 10/20/30 XP." />
            <Step n={3} title="Streak, level up, repeat" body="Daily completion locks in streaks. Streak ≥3 days = XP multiplier. Bond levels unlock rare character moments." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-y border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Your future self is waiting.</h2>
          <p className="mt-3 text-gray-300">Pick a companion. Finish one task. The rest builds itself.</p>
          <Link href="/login?signup=1">
            <Button size="lg" className="mt-7 bg-white text-gray-900 hover:bg-gray-100">
              Get started free <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
          <Link href="/login" className="hover:text-gray-300">Sign in</Link>
        </div>
        © {new Date().getFullYear()} TaskCrewAI
      </footer>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 text-purple-300 mb-1">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-6">
        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold mb-3">
          {n}
        </div>
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  )
}
