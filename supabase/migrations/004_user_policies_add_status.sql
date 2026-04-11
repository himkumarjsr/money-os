-- Add status if the table was created before 003 or without this column (fixes schema cache errors on insert).
alter table public.user_policies
  add column if not exists status text not null default 'active';
