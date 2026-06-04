create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  plan text not null check (plan in ('Free', 'Premium')),
  total_xp integer not null default 0,
  streak_count integer not null default 0,
  message_count jsonb not null default '{}'::jsonb,
  crew jsonb not null default '[]'::jsonb,
  bond_levels jsonb not null default '{}'::jsonb,
  chat_history jsonb not null default '{}'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  last_task_check text not null,
  last_login text,
  last_checkin_time bigint,
  custom_character jsonb,
  daily_quests jsonb not null default '[]'::jsonb,
  streak_freezes integer not null default 1,
  focus_minutes_total integer not null default 0,
  onboarded boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_renews_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Idempotent column adds for existing installations.
alter table public.user_profiles add column if not exists daily_quests jsonb not null default '[]'::jsonb;
alter table public.user_profiles add column if not exists streak_freezes integer not null default 1;
alter table public.user_profiles add column if not exists focus_minutes_total integer not null default 0;
alter table public.user_profiles add column if not exists onboarded boolean not null default false;
alter table public.user_profiles add column if not exists stripe_customer_id text;
alter table public.user_profiles add column if not exists stripe_subscription_id text;
alter table public.user_profiles add column if not exists plan_renews_at timestamptz;
alter table public.user_profiles add column if not exists xp_today integer not null default 0;
alter table public.user_profiles add column if not exists xp_today_date text;
alter table public.user_profiles add column if not exists daily_goal integer not null default 50;
alter table public.user_profiles add column if not exists sound_enabled boolean not null default true;
alter table public.user_profiles add column if not exists persona text;
alter table public.user_profiles add column if not exists active_companion_id integer;

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "anon can manage own user_id profile" on public.user_profiles;
drop policy if exists "users can select own profile" on public.user_profiles;
drop policy if exists "users can insert own profile" on public.user_profiles;
drop policy if exists "users can update own profile" on public.user_profiles;
drop policy if exists "users can delete own profile" on public.user_profiles;

create policy "users can select own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own profile"
on public.user_profiles
for delete
to authenticated
using (auth.uid() = user_id);
