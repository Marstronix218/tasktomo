export const STRIPE_PLANS = {
  monthly: {
    priceIdEnv: "STRIPE_PRICE_ID_MONTHLY",
    label: "Premium Monthly",
    amountCents: 900,
    interval: "month" as const,
  },
  yearly: {
    priceIdEnv: "STRIPE_PRICE_ID_YEARLY",
    label: "Premium Yearly",
    amountCents: 7200,
    interval: "year" as const,
  },
}

export type StripePlanKey = keyof typeof STRIPE_PLANS

export function getStripeKeys() {
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const monthlyPriceId = process.env[STRIPE_PLANS.monthly.priceIdEnv]
  const yearlyPriceId = process.env[STRIPE_PLANS.yearly.priceIdEnv]
  return { secret, webhookSecret, monthlyPriceId, yearlyPriceId }
}

export function stripeIsConfigured() {
  const { secret, monthlyPriceId, yearlyPriceId } = getStripeKeys()
  return Boolean(secret && monthlyPriceId && yearlyPriceId)
}
