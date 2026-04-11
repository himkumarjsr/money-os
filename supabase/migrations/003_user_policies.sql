-- Per-user insurance policy vault (renewals, transfer status)
create table if not exists public.user_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_type text not null,
  insurer_name text not null default '',
  policy_number text,
  plan_name text,
  cover_amount numeric not null default 0,
  premium_amount numeric not null default 0,
  premium_frequency text not null default 'monthly',
  renewal_date date not null,
  purchase_date date,
  nominee_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_policies_user_id_idx on public.user_policies (user_id);
create index if not exists user_policies_renewal_date_idx on public.user_policies (renewal_date);

alter table public.user_policies enable row level security;

create policy "Users can read own policies"
  on public.user_policies for select
  using (auth.uid() = user_id);

create policy "Users can insert own policies"
  on public.user_policies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own policies"
  on public.user_policies for update
  using (auth.uid() = user_id);

create policy "Users can delete own policies"
  on public.user_policies for delete
  using (auth.uid() = user_id);
