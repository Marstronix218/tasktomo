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

  const handleGoogle = async () => {
    setErrorMessage("")
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
      },
    })
    if (error) setErrorMessage(error.message)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-6">
        <img src="/logo.png" alt="TaskCrewAI" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-lg">TaskCrewAI</span>
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
          <Button
            type="button"
            onClick={handleGoogle}
            variant="outline"
            className="w-full bg-white text-gray-900 hover:bg-gray-100 border-0"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-gray-900 px-2 text-gray-500">or</span></div>
          </div>
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
