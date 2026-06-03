import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getStripeKeys, stripeIsConfigured } from "@/lib/stripe"

/**
 * Stripe webhook for subscription lifecycle.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY          — same as checkout route
 *   STRIPE_WEBHOOK_SECRET      — whsec_... from your webhook endpoint
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key for server-side DB writes
 *   NEXT_PUBLIC_SUPABASE_URL   — already in your env
 *
 * Configure in Stripe dashboard: send checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted to /api/stripe/webhook.
 */
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  if (!stripeIsConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }
  const { secret, webhookSecret } = getStripeKeys()
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 503 })
  }
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRole) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 })
  }

  let Stripe: any
  try {
    Stripe = (await import("stripe")).default
  } catch {
    return NextResponse.json({ error: "stripe sdk missing" }, { status: 500 })
  }

  const stripe = new Stripe(secret!, { apiVersion: "2024-12-18.acacia" as any })
  const sig = req.headers.get("stripe-signature") || ""
  const rawBody = await req.text()

  let event: any
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "bad signature" }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } })

  const setPlan = async (
    userId: string,
    plan: "Free" | "Premium",
    extras: { customerId?: string; subscriptionId?: string; renewsAt?: string } = {},
  ) => {
    const updates: Record<string, unknown> = { plan }
    if (extras.customerId !== undefined) updates.stripe_customer_id = extras.customerId
    if (extras.subscriptionId !== undefined) updates.stripe_subscription_id = extras.subscriptionId
    if (extras.renewsAt !== undefined) updates.plan_renews_at = extras.renewsAt
    await admin.from("user_profiles").update(updates).eq("user_id", userId)
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const userId = session.client_reference_id || session.metadata?.user_id
        if (userId) {
          await setPlan(userId, "Premium", {
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
          })
        }
        break
      }
      case "customer.subscription.updated": {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        const renewsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined
        if (userId) {
          const active = sub.status === "active" || sub.status === "trialing"
          await setPlan(userId, active ? "Premium" : "Free", {
            customerId: sub.customer as string,
            subscriptionId: sub.id,
            renewsAt,
          })
        }
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        if (userId) {
          await setPlan(userId, "Free", { subscriptionId: null as any })
        }
        break
      }
      default:
        // Ignored event
        break
    }
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: err.message || "handler error" }, { status: 500 })
  }
}
