# Deploying TaskCrewAI

End-to-end checklist to go from this repo to a live, paid product.

---

## 1. Supabase (database + auth)

1. Create a Supabase project at https://supabase.com → grab the project URL and `anon` key.
2. Run [supabase/schema.sql](supabase/schema.sql) in the SQL editor. It's idempotent — safe to re-run after migrations.
3. **Auth providers**:
   - Email/password is enabled by default.
   - For Google: Auth → Providers → Google → paste a Google OAuth client ID + secret. Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback` as an authorized redirect URI in the Google Cloud console.
4. **Auth → URL Configuration**: set Site URL to your production domain. Add `http://localhost:3000` to the redirect allow-list for local dev.
5. Grab the `service_role` key (Project Settings → API → secret). You'll need it for the Stripe webhook.

## 2. Stripe (subscriptions)

1. Create a Stripe account, switch to test mode for now.
2. Create a Product called "Premium" with two prices: $9 / month and $72 / year. Copy the price IDs.
3. **Webhook**: Stripe Dashboard → Webhooks → Add endpoint. URL = `https://YOUR_DOMAIN/api/stripe/webhook`. Send these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret (`whsec_...`).
5. (Optional) Customer portal — enable in Stripe → Settings → Billing → Customer portal so users can manage their own subs.

## 3. Environment variables

Local: copy these to `.env.local`. Production: paste them into Vercel / your host.

```env
# Required — AI chat
OPENAI_API_KEY=sk-...

# Required — auth + persistence
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # server-only, used by Stripe webhook

# Required — Stripe checkout
STRIPE_SECRET_KEY=sk_test_...                  # or sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# Required — site URL (return URLs from Stripe)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com    # http://localhost:3000 for local
```

If Stripe vars are missing, `/pricing` will still render and `/api/stripe/checkout` returns a graceful 503 — the rest of the app works without payments.

## 4. Deploying to Vercel

```sh
# From repo root
vercel
# Then: vercel env add ... for each variable above
# Or paste them in the Vercel dashboard → Project → Settings → Environment Variables.
```

Vercel auto-detects Next.js. Default settings are fine.

## 5. Local development

```sh
npm install --legacy-peer-deps          # React 19 peer-dep conflicts otherwise
npm run dev                              # http://localhost:3000
```

To test Stripe webhooks locally:

```sh
# In a second terminal
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Stripe CLI prints the webhook secret — put it in .env.local as STRIPE_WEBHOOK_SECRET
```

## 6. Pre-launch checklist

- [ ] Run `npm run lint` and `npx tsc --noEmit` — `next build` does NOT enforce these (`next.config.mjs` ignores them).
- [ ] Manual flow: sign up → onboarding → add a task → complete → focus session → upgrade flow → cancel from Stripe portal.
- [ ] Verify RLS works: open `user_profiles` in Supabase, try to read another user's row with a regular session token. Should fail.
- [ ] Turn on Stripe live mode and swap `sk_test_*` keys for `sk_live_*`.
- [ ] Add a privacy policy and terms-of-service page (not included).
- [ ] Set up a custom domain + SSL (Vercel auto-handles SSL).

## 7. Cost notes

- OpenAI: every task completion + check-in calls `gpt-4.1-nano`. Budget ~$0.0001/call. For a heavy user (50 tasks/day), that's < $0.005/day.
- Supabase: free tier covers ~50k MAU for this workload.
- Stripe: 2.9% + 30¢ per successful charge.

At $9/mo with $0.50/user OpenAI + Stripe fees, gross margin ~85%.

## 8. Growth knobs already built in

- Daily quests auto-generate per user — keeps engagement on idle days.
- Streak Freeze (1 free, 3/mo for Premium) — major retention lever.
- "At-risk" streak banner appears in the last 6 hours of the day if nothing's been done.
- Focus timer is unmetered on Free — gives non-paying users real value, builds trust.
