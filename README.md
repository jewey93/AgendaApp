# Daily Agenda — Supabase + Vercel edition

This is your productivity dashboard wired up for real accounts and persistent
storage: React + Vite frontend, Supabase for authentication and the
database, deployable to Vercel. Total cost at personal-use scale: **$0/month**
on the free tiers of both services.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. Once the project is ready, open **SQL Editor** in the left sidebar, paste
   in the contents of `supabase/schema.sql` from this folder, and run it.
   This creates the `app_storage` table and locks it down with Row Level
   Security so each user can only ever read or write their own rows.
3. Go to **Project Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon / public** key (not the `service_role` key — never expose that
     one in a frontend app)
4. (Optional, for faster local testing) Go to **Authentication → Providers →
   Email** and turn off "Confirm email" so you can sign up and log in
   immediately without checking your inbox. Turn it back on before you
   share the app with anyone else.

## 2. Configure the app

```bash
cp .env.example .env
```

Open `.env` and paste in your Project URL and anon key from step 1.

## 3. Run it locally

```bash
npm install
npm run dev
```

Visit the URL Vite prints (usually `http://localhost:5173`). Sign up for an
account, log in, and your tasks/goals/fitness data will now persist to
Supabase instead of disappearing on refresh.

## 4. Deploy

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), "Add New Project", and import
   that repo. Vercel auto-detects Vite — no config needed.
3. In the Vercel project's **Settings → Environment Variables**, add the
   same two values from your `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Vercel gives you a `https://your-app.vercel.app` URL with SSL
   included automatically. You can attach a custom domain later under
   **Settings → Domains**.

## How data is stored

The app persists its state as JSON under one row per user in the
`app_storage` table (mirroring how it worked in the browser-only prototype,
just server-side now). Row Level Security enforces that a user can only
read or write rows where `user_id` matches their own authenticated session
— this is checked by Postgres itself, not just the app's code, so it holds
even if someone tampers with API requests directly.

If you later want real SQL queries over individual tasks (filtering,
reporting, joins), see the commented-out example schema at the bottom of
`supabase/schema.sql` for how to move to normalized tables. That's a bigger
step and intentionally left for later — the current approach covers
everything the app does today with much less migration risk.

## Security notes

- Passwords are hashed and managed entirely by Supabase Auth — this app
  never sees or stores raw passwords.
- The anon key is safe to expose in frontend code by design; it only grants
  the permissions your RLS policies allow.
- Never commit your `.env` file or the `service_role` key anywhere.

## Project structure

This project is organized into four layers — see **`ARCHITECTURE.md`** for
the full explanation, including how to redesign the UI later without
touching business logic or data:

```
src/domain/   business rules (task model, the rapid-capture parser)
src/data/     persistence (Supabase client, repository)
src/state/    the hook that wires domain + data together
src/ui/       everything you see (components, styling, the Capture screen)
```

## The Capture screen

The sidebar now opens on **Capture** by default — a full-page, ruled-paper
style textarea for writing your day out the way you would on paper. Each
line becomes a task. Optional shorthand (`9am`, `!high`, `@work`, `#tag`,
`~30m`) fills in structured fields, but plain sentences work fine too.
Press `Cmd/Ctrl + Enter` to capture everything on the page at once.

## Security

Your data is end-to-end encrypted: everything is encrypted in your
browser with a passphrase only you know, before it's ever sent to
Supabase. Supabase only ever stores unreadable ciphertext — not even a
database breach would expose your notes. Full explanation in
`ARCHITECTURE.md` under "Security: what changed and why."

**Important:** the first time you log in, you'll be asked to create an
encryption passphrase (separate from your login password). There is no
recovery for this — write it down somewhere safe. This is intentional:
a recoverable passphrase would mean someone else could get in too.

## Also included

- **Journal** — a dedicated page for free-form, timestamped daily entries
  (separate from the single "daily notes" field on the Daily planner),
  with search across all past entries.
- **Calendar improvements** — drag any task onto a different day in the
  Weekly or Monthly view to reschedule it; add multi-day events that
  render as spanning bars on the Monthly grid.
- **Reminders** — a bell icon in the sidebar shows due-soon and overdue
  tasks at a glance, with an optional one-click opt-in to real browser
  notifications.

## Costs at a glance

| Service | Free tier covers |
|---|---|
| Vercel | Hosting, SSL, CDN — generous free tier for personal projects |
| Supabase | 500MB database, 50k monthly active users, auth included |

You'd only start paying if this grows into a multi-user product with real
traffic — at which point both platforms scale with simple paid tiers rather
than requiring any infrastructure changes on your part.
