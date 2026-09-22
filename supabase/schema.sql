-- ABC List schema.
-- Paste this whole file into the Supabase dashboard: SQL Editor -> New query -> Run.
-- Safe to run more than once.

create extension if not exists "pgcrypto";

create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text         text not null check (char_length(trim(text)) between 1 and 2000),
  list         text not null check (list in ('A', 'B', 'C')),
  position     double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- An item is "active" while completed_at is null and "archived" once it is set.
  -- Completing never deletes anything; the archive is the safe-keeping the app promises.
  completed_at timestamptz,
  -- Which list the item was sitting in when it got completed, so Restore can put it back.
  completed_from text check (completed_from in ('A', 'B', 'C'))
);

-- The two queries the app actually runs: the active board, and the archive.
create index if not exists items_board_idx
  on public.items (owner, list, position)
  where completed_at is null;

create index if not exists items_archive_idx
  on public.items (owner, completed_at desc)
  where completed_at is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security.
--
-- This is what makes the password real rather than cosmetic. With RLS on and no
-- policy granting anonymous access, the public anon key alone reads nothing at all.
-- Every policy below requires a signed-in session, and further requires that the
-- row's owner matches that session's user id. So even if somebody created their own
-- account on the project, they would see an empty board, never the family's.
-- ---------------------------------------------------------------------------

alter table public.items enable row level security;

drop policy if exists "owner reads own items"   on public.items;
drop policy if exists "owner inserts own items" on public.items;
drop policy if exists "owner updates own items" on public.items;
drop policy if exists "owner deletes own items" on public.items;

create policy "owner reads own items"
  on public.items for select
  to authenticated
  using (owner = auth.uid());

create policy "owner inserts own items"
  on public.items for insert
  to authenticated
  with check (owner = auth.uid());

create policy "owner updates own items"
  on public.items for update
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

create policy "owner deletes own items"
  on public.items for delete
  to authenticated
  using (owner = auth.uid());

-- Let the app receive live updates, so two family members with the board open
-- see each other's changes without refreshing. Realtime respects the policies above.
do $$
begin
  alter publication supabase_realtime add table public.items;
exception
  when duplicate_object then null;
end;
$$;
