"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, ArrowLeft, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

const FREE_FEATURES = [
  "5 of 10 AI companions",
  "Up to 3 active companions",
  "20 messages per companion / day",
  "Unlimited tasks & focus timer",
  "Daily quests + streaks",
]

const PREMIUM_FEATURES = [
  "All 10 AI companions",
  "Up to 5 active companions",
  "Unlimited daily messages",
  "Group chat with up to 3 companions",
  "Create 1 custom companion",
  "Streak Freezes (3/month)",
  "Weekly review email",
  "Priority chat responses",
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session?.user)
    })
  }, [])

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    if (!isSignedIn) {
      router.push("/login?signup=1")
      return
    }
    setLoading(plan)
    setErrorMessage("")
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || "Could not start checkout.")
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      setErrorMessage("Network error. Try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold">Simple pricing</h1>
          <p className="mt-3 text-gray-400">Free forever for casual use. Upgrade when you're ready to commit.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {/* Free */}
          <Card className="bg-gray-900 border-gray-800 text-white relative">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-bold">Free</h2>
              <p className="text-sm text-gray-400">For getting started.</p>
              <div className="my-5">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-400 text-sm"> / forever</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={isSignedIn ? "/dashboard" : "/login?signup=1"}>
                <Button variant="outline" className="w-full border-gray-700 bg-transparent text-white">
                  {isSignedIn ? "Open dashboard" : "Start free"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Premium */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border-purple-500/40 text-purple-950 relative">
            <Badge className="absolute -top-3 right-6 bg-purple-500 text-purple-950">
              <Crown className="w-3 h-3 mr-1" /> Most popular
            </Badge>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-bold">Premium</h2>
              <p className="text-sm text-purple-900">For people who actually want to ship.</p>
              <div className="my-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$9</span>
                  <span className="text-purple-900 text-sm"> / month</span>
                </div>
                <p className="text-xs text-purple-800 mt-1">or $72 / year — save $36</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <Button
                  onClick={() => handleCheckout("monthly")}
                  disabled={loading !== null}
                  className="w-full bg-white text-purple-700 hover:bg-gray-100"
                >
                  {loading === "monthly" ? "Loading..." : "Upgrade — $9 / month"}
                </Button>
                <Button
                  onClick={() => handleCheckout("yearly")}
                  disabled={loading !== null}
                  variant="outline"
                  className="w-full border-purple-500/40 bg-transparent text-purple-950 hover:bg-purple-900/10"
                >
                  {loading === "yearly" ? "Loading..." : "Save 33% — $72 / year"}
                </Button>
              </div>
              {errorMessage && <p className="text-xs text-red-700 mt-2">{errorMessage}</p>}
              <p className="text-[11px] text-purple-900/80 mt-4 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Cancel anytime · Secured by Stripe
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-xs text-gray-500">
          Questions? <a href="mailto:tasktomo@g-launchers.com" className="underline hover:text-gray-300">Get in touch</a>
        </div>
      </div>
    </div>
  )
}
