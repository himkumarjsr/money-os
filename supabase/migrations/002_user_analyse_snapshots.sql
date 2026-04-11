-- Full analyse wizard + result backup per user (synced from app after submit / on load when logged in)
create table if not exists public.user_analyse_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_analyse_snapshots_updated_at_idx
  on public.user_analyse_snapshots (updated_at desc);

alter table public.user_analyse_snapshots enable row level security;

create policy "Users can read own analyse snapshot"
  on public.user_analyse_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyse snapshot"
  on public.user_analyse_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analyse snapshot"
  on public.user_analyse_snapshots for update
  using (auth.uid() = user_id);
