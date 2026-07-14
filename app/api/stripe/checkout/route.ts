import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { STRIPE_PLANS, getStripeKeys, stripeIsConfigured } from "@/lib/stripe"

/**
 * Creates a Stripe Checkout Session for Premium subscription.
 *
 * Required env vars (add at deploy time):
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   STRIPE_PRICE_ID_MONTHLY  — price_... for $15/mo plan
 *   STRIPE_PRICE_ID_YEARLY   — price_... for $100/yr plan
 *   NEXT_PUBLIC_SITE_URL     — public site URL for return URLs (e.g. https://tasktomo.com)
 *
 * Without these, the route returns a graceful 503 so the UI can show a message
 * instead of crashing during local development.
 */
export async function POST(req: NextRequest) {
  if (!stripeIsConfigured()) {
    return NextResponse.json(
      {
        error: "Premium checkout is coming soon.",
      },
      { status: 503 },
    )
  }

  let body: { plan?: "monthly" | "yearly" } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const planKey = body.plan === "yearly" ? "yearly" : "monthly"
  const { secret, monthlyPriceId, yearlyPriceId } = getStripeKeys()
  const priceId = planKey === "monthly" ? monthlyPriceId : yearlyPriceId

  // Identify the user via Supabase session bearer token (sent automatically by supabase-js? No — we need to forward it).
  // For server-side identification we re-create a Supabase client with the user's access token from the auth header.
  const authHeader = req.headers.get("authorization") || ""
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  // Fallback: also accept user_id in body for clients that pass session via cookies separately.
  const { data: { user } } = await supabaseClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 })
  }

  // Dynamic import keeps the bundle small when stripe isn't configured.
  let Stripe: any
  try {
    Stripe = (await import("stripe")).default
  } catch {
    return NextResponse.json(
      { error: "Stripe SDK not installed. Run: npm install stripe --legacy-peer-deps" },
      { status: 500 },
    )
  }

  const stripe = new Stripe(secret!, { apiVersion: "2024-12-18.acacia" as any })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: planKey },
      success_url: `${siteUrl}/dashboard?upgraded=1`,
      cancel_url: `${siteUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url, id: session.id, plan: STRIPE_PLANS[planKey].label })
  } catch (err: any) {
    console.error("Stripe checkout error:", err)
    return NextResponse.json({ error: err.message || "Stripe error" }, { status: 500 })
  }
}
