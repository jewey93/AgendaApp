-- Daily Agenda App — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- app_storage: one row per (user, key). The app stores its whole state
-- (tasks, goals, fitness log, notes, etc.) as JSON blobs, the same way it
-- did in-browser during prototyping — just persisted server-side now, and
-- locked to each user via Row Level Security instead of the app trusting
-- the client. This is intentionally simple; see the note at the bottom for
-- how to normalize into relational tables later if you want per-task
-- queries, joins, or reporting across tasks directly in SQL.
-- ---------------------------------------------------------------------------
create table if not exists app_storage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, key, shared)
);

create index if not exists app_storage_user_id_idx on app_storage (user_id);

alter table app_storage enable row level security;

-- Users can only read/write their own rows.
create policy "select own rows" on app_storage
  for select using (auth.uid() = user_id);

create policy "insert own rows" on app_storage
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on app_storage
  for update using (auth.uid() = user_id);

create policy "delete own rows" on app_storage
  for delete using (auth.uid() = user_id);

-- Optional: if you ever use shared=true for something like a leaderboard,
-- this lets any authenticated user read (but not write) shared rows.
create policy "select shared rows" on app_storage
  for select using (shared = true);

-- Keep updated_at accurate on every write.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_storage_updated_at on app_storage;
create trigger trg_app_storage_updated_at
before update on app_storage
for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Optional: normalized tables for the future
-- ---------------------------------------------------------------------------
-- If down the line you want real SQL queries over individual tasks (e.g.
-- "show me all overdue high-priority work tasks across every user I manage"),
-- you'd move away from the JSON-blob model above to real tables, roughly:
--
--   create table tasks (
--     id uuid primary key default gen_random_uuid(),
--     user_id uuid not null references auth.users(id) on delete cascade,
--     title text not null,
--     category text not null,
--     priority text not null default 'medium',
--     due_date date,
--     due_time time,
--     duration_minutes int,
--     completed boolean not null default false,
--     notes text,
--     tags text[] default '{}',
--     recurrence text default 'none',
--     created_at timestamptz not null default now()
--   );
--   alter table tasks enable row level security;
--   create policy "own tasks" on tasks for all using (auth.uid() = user_id);
--
-- This is a bigger refactor of the frontend's data layer, so it's left as a
-- future step rather than done here — the JSON-blob approach above covers
-- everything the app currently needs with much less migration risk.
