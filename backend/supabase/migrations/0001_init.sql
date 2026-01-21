-- Supabase test task v3

-- Extensions
create extension if not exists pgcrypto;

-- Compatibility: pgcrypto may be installed in schema 'extensions' in Supabase.
-- When installed there, gen_random_bytes() is not on the default search_path.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'gen_random_bytes' AND n.nspname = 'extensions'
  ) THEN
    -- Create a public wrapper only if the function is not already available in public.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'gen_random_bytes' AND n.nspname = 'public'
    ) THEN
      CREATE OR REPLACE FUNCTION public.gen_random_bytes(n int)
      RETURNS bytea
      LANGUAGE sql
      IMMUTABLE
      AS $fn$ SELECT extensions.gen_random_bytes(n); $fn$;
    END IF;
  END IF;
END $$;

create extension if not exists pg_trgm;
create extension if not exists pg_cron;

-- Enum
DO $$ BEGIN
  create type public.product_status as enum ('draft','active','deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- Profiles (one row per auth user; one team per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  team_id uuid references public.teams(id),
  created_at timestamptz not null default now()
);

-- If table existed from earlier, ensure email column exists
alter table if exists public.profiles
  add column if not exists email text;

-- Helper: current user's team_id
create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  image_path text,
  status public.product_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) stored
);

create index if not exists idx_products_team on public.products(team_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_updated_at on public.products(updated_at);
create index if not exists idx_products_created_by on public.products(created_by);
create index if not exists idx_products_fts on public.products using gin(fts);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- set deleted_at when status becomes deleted
create or replace function public.set_deleted_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'deleted' and old.status is distinct from 'deleted' then
    new.deleted_at = coalesce(new.deleted_at, now());
  end if;
  return new;
end $$;

drop trigger if exists trg_products_deleted_at on public.products;
create trigger trg_products_deleted_at
before update on public.products
for each row execute function public.set_deleted_at();

-- Enforce product rules at DB level:
-- - Draft: editable
-- - Active: cannot edit fields; can only transition to Deleted
-- - Deleted: locked
create or replace function public.enforce_product_rules()
returns trigger language plpgsql as $$
begin
  if old.status = 'active' then
    if (new.title is distinct from old.title)
      or (new.description is distinct from old.description)
      or (new.image_path is distinct from old.image_path) then
      raise exception 'Active products cannot be edited';
    end if;

    if new.status is distinct from old.status and new.status <> 'deleted' then
      raise exception 'Active products can only transition to deleted';
    end if;
  end if;

  if old.status = 'deleted' then
    raise exception 'Deleted products cannot be modified';
  end if;

  return new;
end $$;

drop trigger if exists trg_products_rules on public.products;
create trigger trg_products_rules
before update on public.products
for each row execute function public.enforce_product_rules();

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Team RPCs
create or replace function public.create_team(team_name text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.teams;
  code text;
begin
  if public.current_team_id() is not null then
    raise exception 'User already has a team';
  end if;

  code := encode(gen_random_bytes(4), 'hex');
  insert into public.teams(name, invite_code)
  values (team_name, code)
  returning * into t;

  update public.profiles set team_id = t.id where id = auth.uid();
  return t;
end $$;

create or replace function public.join_team(invite text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.teams;
begin
  if public.current_team_id() is not null then
    raise exception 'User already has a team';
  end if;

  select * into t from public.teams where invite_code = invite;
  if t.id is null then
    raise exception 'Invalid invite code';
  end if;

  update public.profiles set team_id = t.id where id = auth.uid();
  return t;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.products enable row level security;

-- profiles: select self + teammates; update self
DROP POLICY IF EXISTS profiles_select_team ON public.profiles;
create policy profiles_select_team on public.profiles
for select
using (id = auth.uid() or team_id = public.current_team_id());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
create policy profiles_update_self on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- teams: select only your team
DROP POLICY IF EXISTS teams_select_own ON public.teams;
create policy teams_select_own on public.teams
for select
using (id = public.current_team_id());

-- products: team scoped
DROP POLICY IF EXISTS products_select_team ON public.products;
create policy products_select_team on public.products
for select
using (team_id = public.current_team_id());

DROP POLICY IF EXISTS products_insert_team ON public.products;
create policy products_insert_team on public.products
for insert
with check (team_id = public.current_team_id() and created_by = auth.uid());

DROP POLICY IF EXISTS products_update_team ON public.products;
create policy products_update_team on public.products
for update
using (team_id = public.current_team_id())
with check (team_id = public.current_team_id());

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

-- Storage policies (team-scoped by first folder segment = team_id)
DROP POLICY IF EXISTS "Team can read product images" ON storage.objects;
create policy "Team can read product images" on storage.objects
for select to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (public.current_team_id())::text
);

DROP POLICY IF EXISTS "Team can upload product images" ON storage.objects;
create policy "Team can upload product images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (public.current_team_id())::text
);

DROP POLICY IF EXISTS "Team can update product images" ON storage.objects;
create policy "Team can update product images" on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (public.current_team_id())::text
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (public.current_team_id())::text
);

DROP POLICY IF EXISTS "Team can delete product images" ON storage.objects;
create policy "Team can delete product images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (public.current_team_id())::text
);

-- Cron purge: hard delete Deleted products older than 14 days
create or replace function public.purge_deleted_products()
returns void
language sql
as $$
  delete from public.products
  where status = 'deleted'
    and deleted_at is not null
    and deleted_at < now() - interval '14 days';
$$;

-- Schedule (idempotent)
DO $$
DECLARE
  jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'purge_deleted_products_daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  PERFORM cron.schedule(
    'purge_deleted_products_daily',
    '0 3 * * *',
    $cron$select public.purge_deleted_products();$cron$
  );
END $$;
