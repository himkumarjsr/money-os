-- Product feedback: rating (1–5) + optional message per authenticated user.
-- View all rows in Supabase Dashboard → Table Editor (uses service role; bypasses RLS).

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  message text not null default '',
  context text,
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_user_id_created_at_idx
  on public.app_feedback (user_id, created_at desc);

create index if not exists app_feedback_created_at_idx
  on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

create policy "Users insert own feedback"
  on public.app_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users read own feedback"
  on public.app_feedback for select
  using (auth.uid() = user_id);
