# LawOne App Factory — Master Template

> **FOR BUILDER AGENT:** This is the master template. Every new app is cloned from here. Read this before touching anything.

## What's pre-built

| Feature | Status | File |
|---------|--------|------|
| Supabase auth (magic link) | ✅ Ready | `src/contexts/AuthContext.tsx` |
| Protected route guard | ✅ Ready | `src/components/AuthGuard.tsx` |
| Dashboard shell (sidebar + mobile) | ✅ Ready | `src/components/DashboardShell.tsx` |
| Lemon Squeezy checkout | ✅ Ready | `src/components/CheckoutButton.tsx` |
| Subscription status check | ✅ Ready | `src/lib/lemonsqueezy.ts` |
| Webhook handler (Vercel) | ✅ Ready | `src/api/webhook.ts` |
| AI feature wrapper | ✅ Ready | `src/lib/ai.ts` |
| 3-step onboarding flow | ✅ Ready | `src/pages/Onboarding.tsx` |
| Database schema + RLS | ✅ Ready | `supabase/migrations/001_initial.sql` |
| Auto-deploy on push | ✅ Ready | `.github/workflows/deploy.yml` |

## How to customise for a new app (Builder agent checklist)

### 1. Clone and rename
```bash
git clone https://github.com/lawones-cloud/app-template [new-app-id]
cd [new-app-id]
git remote set-url origin https://github.com/lawones-cloud/[new-app-id]
```

### 2. Set environment variables
Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — from new Supabase project
- `VITE_LEMONSQUEEZY_VARIANT_ID` — from new Lemon Squeezy product
- `VITE_APP_NAME` — the app name
- `VITE_APP_TAGLINE` — one-line value proposition

### 3. Customise branding
- `src/index.css` — change `--primary` color variable to match app brand
- `src/pages/Landing.tsx` — update feature bullets and stats
- App name/tagline auto-reads from env vars (no code changes needed)

### 4. Customise onboarding (src/pages/Onboarding.tsx)
Replace `DEFAULT_STEPS` array with 3 steps relevant to this app.

### 5. Customise dashboard (src/pages/Dashboard.tsx)
- Replace `NAV_ITEMS` with app-specific nav
- Replace main content area with app features from PRD
- Use `callAI()` from `src/lib/ai.ts` for any AI feature

### 6. Add app-specific DB tables
Create `supabase/migrations/002_[app_name].sql` with app-specific tables.
Always enable RLS on every table.

### 7. Build and test
```bash
npm run build   # must pass with zero errors
npm run dev     # test locally
```

## What NOT to change (never modify these)

- `src/contexts/AuthContext.tsx` — auth is pre-wired, don't touch
- `src/components/AuthGuard.tsx` — leave as-is
- `src/api/webhook.ts` — only update if Lemon Squeezy adds new events
- `supabase/migrations/001_initial.sql` — never modify, only add new migration files
- `vercel.json` — SPA routing is correct, don't change

## Security rules (mandatory)

- All new Supabase tables MUST have RLS enabled
- Never put secret keys in `VITE_*` vars (they're public) — only public keys
- Service role key stays server-side only (webhook handler)
- Webhook signature verification must never be disabled

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion + Supabase + Lemon Squeezy + OpenRouter via Axios
