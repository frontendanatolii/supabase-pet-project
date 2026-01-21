# Supabase test task v3 — Full project (backend + frontend)

This project implements the test task using:
- Supabase Auth / Postgres / Storage / Realtime
- Supabase Edge Functions (backend API)
- Next.js (App Router) + React Query + axios
- Tailwind + lightweight shadcn-style UI components

## Folder structure
- `backend/supabase`
  - `migrations/0001_init.sql` — schema, RLS, storage policies, cron purge
  - `functions/api` — Edge Function API (JWT-verified)
- `frontend`
  - Next.js app with pages: `/auth`, `/onboarding`, `/app/products`, `/app/products/new`, `/app/products/[id]`, `/app/team`

## Local run (recommended)

### 1) Start Supabase locally
```bash
cd backend/supabase
supabase start
supabase db reset
```

### 2) Serve the Edge Function API
```bash
# in backend/supabase
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY from `supabase status`
# (If your shell does not auto-load .env, export vars explicitly)
export $(cat .env | xargs)
supabase functions serve api
```

### 3) Run Next.js
```bash
cd ../../frontend
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_ANON_KEY from `supabase status`
npm i
npm run dev
```

Open:
- http://localhost:3000

## Notes
- Products are team-scoped via RLS; the Edge Function uses the user's JWT for DB access.
- Product rules are enforced at the database layer:
  - Draft is editable
  - Active cannot be edited
  - Delete is soft-delete (status=deleted) and hard-deleted by cron after 14 days
- Storage bucket `product-images` is private and team-scoped by path prefix: `<team_id>/...`
- Team online/offline uses Supabase Realtime presence (`team:<teamId>` channel)
# supabase-pet-project
