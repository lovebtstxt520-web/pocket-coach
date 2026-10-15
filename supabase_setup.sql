-- Pocket Coach: run this once in Supabase > SQL Editor > New query > Run.

-- 1. Backup and sync: one row per user with their app data.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "own data" on public.user_data;
create policy "own data" on public.user_data for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Saving challenges with friends.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  currency text not null default 'THB',
  ends_at timestamptz not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null,
  saved numeric not null default 0,
  skipped int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

create or replace function public.is_member(cid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from challenge_members where challenge_id = cid and user_id = auth.uid());
$$;

drop policy if exists "see my challenges" on public.challenges;
drop policy if exists "create challenge" on public.challenges;
drop policy if exists "delete own challenge" on public.challenges;
create policy "see my challenges" on public.challenges for select to authenticated using (created_by = auth.uid() or public.is_member(id));
create policy "create challenge" on public.challenges for insert to authenticated with check (created_by = auth.uid());
create policy "delete own challenge" on public.challenges for delete to authenticated using (created_by = auth.uid());

drop policy if exists "see members" on public.challenge_members;
drop policy if exists "creator joins" on public.challenge_members;
drop policy if exists "update self" on public.challenge_members;
drop policy if exists "leave" on public.challenge_members;
create policy "see members" on public.challenge_members for select to authenticated using (public.is_member(challenge_id));
create policy "creator joins" on public.challenge_members for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from challenges c where c.id = challenge_id and c.created_by = auth.uid()));
create policy "update self" on public.challenge_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave" on public.challenge_members for delete to authenticated using (user_id = auth.uid());

-- Friends join with the code (the code is the only way in).
create or replace function public.join_challenge(p_code text, p_name text) returns public.challenges
language plpgsql security definer set search_path = public as $$
declare c challenges;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into c from challenges where code = upper(trim(p_code));
  if not found then raise exception 'Code not found'; end if;
  insert into challenge_members (challenge_id, user_id, display_name) values (c.id, auth.uid(), left(coalesce(nullif(trim(p_name), ''), 'Friend'), 30))
  on conflict (challenge_id, user_id) do update set display_name = excluded.display_name;
  return c;
end $$;

revoke all on function public.join_challenge(text, text) from public, anon;
grant execute on function public.join_challenge(text, text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant select, insert, update, delete on public.user_data, public.challenges, public.challenge_members to authenticated;

-- 3. Feature ideas from users (added in version 6.3). Users can only send; only you can read them in the dashboard.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  lang text,
  profile text,
  app_version text,
  message text not null check (char_length(message) between 3 and 1000)
);
alter table public.feedback enable row level security;
drop policy if exists "anyone can send ideas" on public.feedback;
create policy "anyone can send ideas" on public.feedback for insert to anon, authenticated
  with check (char_length(message) between 3 and 1000 and (user_id is null or user_id = auth.uid()));
grant insert on public.feedback to anon, authenticated;
