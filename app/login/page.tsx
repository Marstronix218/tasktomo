"use client"

import { type FormEvent, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSignUp = searchParams.get("signup") === "1"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(initialSignUp)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session?.user) router.replace("/dashboard")
    })
    return () => {
      active = false
    }
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")
    setIsLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        },
      })
      if (error) {
        setErrorMessage(error.message)
      } else {
        setSuccessMessage("Check your email for a confirmation link, then sign in.")
      }
      setIsLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    router.replace("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-6">
        <img src="/logo.png" alt="TaskTomo" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-lg">TaskTomo</span>
      </Link>
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">{isSignUp ? "Create your account" : "Welcome back"}</CardTitle>
          <p className="text-sm text-gray-400">
            {isSignUp
              ? "Pick your AI crew and start a streak in under 60 seconds."
              : "Your crew has been waiting."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
            {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
            <Button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
              {isLoading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsSignUp((p) => !p)
                setErrorMessage("")
                setSuccessMessage("")
              }}
              className="w-full text-gray-300"
            >
              {isSignUp ? "Have an account? Sign in" : "New here? Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-gray-500">
        By continuing you agree to be productive (mostly).{" "}
        <Link href="/" className="underline hover:text-gray-300">Back home</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <LoginForm />
    </Suspense>
  )
}
