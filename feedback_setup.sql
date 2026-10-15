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
