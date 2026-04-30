create extension if not exists vector;

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  phone text,
  email text,
  is_admin boolean default false,
  referral_code text unique,
  referred_by text,
  subscription_tier text default 'free',
  subscription_expiry timestamptz,
  fk_balance integer default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_analysis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  profile_hash text,
  profile jsonb not null default '{}',
  analysis_result jsonb,
  ai_fix_plan jsonb,
  projection jsonb,
  ai_generated_at timestamptz,
  last_step_completed integer default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.finkoin_knowledge (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  subcategory text,
  title text not null,
  content text not null,
  keywords text[] not null default '{}',
  applies_when text,
  priority_context text[],
  embedding vector(384),
  is_active boolean default true,
  last_updated date default current_date,
  source text,
  created_at timestamptz default now()
);

create index if not exists knowledge_keywords_idx
  on public.finkoin_knowledge using gin (keywords);

create table if not exists public.gamification (
  user_id uuid references auth.users(id) on delete cascade primary key,
  fk_balance integer default 50,
  badges jsonb default '[]',
  streak_days integer default 0,
  last_login date default current_date,
  total_earned integer default 50,
  created_at timestamptz default now()
);

create table if not exists public.insurance_clicks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  insurance_type text,
  insurer_name text,
  recommended_cover numeric,
  monthly_premium numeric,
  user_age integer,
  city text,
  fk_tokens_used integer default 0,
  clicked_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.user_analysis enable row level security;
alter table public.finkoin_knowledge enable row level security;
alter table public.gamification enable row level security;
alter table public.insurance_clicks enable row level security;

drop policy if exists "users_own" on public.users;
create policy "users_own" on public.users for all using (auth.uid() = id);
drop policy if exists "analysis_own" on public.user_analysis;
create policy "analysis_own" on public.user_analysis for all using (auth.uid() = user_id);
drop policy if exists "knowledge_read" on public.finkoin_knowledge;
create policy "knowledge_read" on public.finkoin_knowledge for select using (true);
drop policy if exists "gamification_own" on public.gamification;
create policy "gamification_own" on public.gamification for all using (auth.uid() = user_id);
drop policy if exists "clicks_own" on public.insurance_clicks;
create policy "clicks_own" on public.insurance_clicks for insert with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, subscription_tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'free'
  );

  insert into public.gamification (user_id, fk_balance) values (new.id, 50);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function search_by_keywords(
  search_keywords text[],
  match_count int default 10
)
returns table (
  id uuid,
  category text,
  subcategory text,
  title text,
  content text,
  keywords text[],
  applies_when text,
  priority_context text[],
  relevance_score int
)
language sql stable
as $$
  select
    id, category, subcategory, title, content, keywords, applies_when, priority_context,
    cardinality(array(select unnest(keywords) intersect select unnest(search_keywords))) as relevance_score
  from public.finkoin_knowledge
  where is_active = true and keywords && search_keywords
  order by relevance_score desc
  limit match_count;
$$;
