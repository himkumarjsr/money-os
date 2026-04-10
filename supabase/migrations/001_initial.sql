-- Finkoin initial profile/auth extension tables
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  referral_code text unique,
  referred_by text,
  pan_verified boolean default false,
  pan_last4 text,
  aadhaar_verified boolean default false,
  subscription_tier text default 'free',
  subscription_expiry timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id bigserial primary key,
  referrer_user_id uuid references public.users(id) on delete cascade,
  referred_user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  subscribed_at timestamptz
);

create table if not exists public.user_stats (
  user_id uuid primary key references public.users(id) on delete cascade,
  fk_balance integer default 0,
  badges_count integer default 0,
  streak_days integer default 0,
  last_analysis_at timestamptz
);

