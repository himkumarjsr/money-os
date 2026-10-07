-- =============================================================================
-- Finkoin — user data audit notes (READ-ONLY)
-- =============================================================================
-- Run in Supabase → SQL Editor. These queries only SELECT — they do not delete
-- users, rows, or tables.
--
-- Replace this uuid everywhere (example power user):
--   36a2c461-9574-43bd-a44d-844b01dd2462
--
-- Or find by email first:
--   select id, email, created_at, last_sign_in_at
--   from auth.users
--   where email = 'USER_EMAIL_HERE';
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A) What tables exist (live DB)
-- -----------------------------------------------------------------------------
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'auth')
  and table_type = 'BASE TABLE'
order by table_schema, table_name;


-- -----------------------------------------------------------------------------
-- B) Columns that link to a user
-- -----------------------------------------------------------------------------
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    column_name in (
      'user_id', 'id', 'created_by', 'referrer_id', 'referred_id',
      'invited_by', 'paid_by_user_id', 'from_user_id', 'to_user_id'
    )
    or column_name ilike '%user%'
  )
order by table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- C) Row counts for one user (what is stored vs empty)
-- -----------------------------------------------------------------------------
-- Note: live referrals columns are referrer_id / referred_id (NOT referrer_user_id).
select 'users' as tbl, count(*)::int as n
from public.users where id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_analysis', count(*)
from public.user_analysis where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_analyse_snapshots', count(*)
from public.user_analyse_snapshots where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_financial_data', count(*)
from public.user_financial_data where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'gamification', count(*)
from public.gamification where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'fk_transactions', count(*)
from public.fk_transactions where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'expense_transactions', count(*)
from public.expense_transactions where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'tracker_consent', count(*)
from public.tracker_consent where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_credit_cards', count(*)
from public.user_credit_cards where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'financial_obligations', count(*)
from public.financial_obligations where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'obligation_checklist', count(*)
from public.obligation_checklist where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_planned_investments', count(*)
from public.user_planned_investments where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_policies', count(*)
from public.user_policies where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'notification_preferences', count(*)
from public.notification_preferences where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'push_subscriptions', count(*)
from public.push_subscriptions where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_notifications', count(*)
from public.user_notifications where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_tip_history', count(*)
from public.user_tip_history where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'app_feedback', count(*)
from public.app_feedback where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'feedback', count(*)
from public.feedback where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'insurance_clicks', count(*)
from public.insurance_clicks where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'tax_documents', count(*)
from public.tax_documents where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'user_stats', count(*)
from public.user_stats where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'financial_profiles', count(*)
from public.financial_profiles where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'referrals_as_referrer', count(*)
from public.referrals where referrer_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'referrals_as_referred', count(*)
from public.referrals where referred_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_group_members', count(*)
from public.split_group_members where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_groups_created', count(*)
from public.split_groups where created_by = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_expenses_created', count(*)
from public.split_expenses where created_by = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_expense_shares', count(*)
from public.split_expense_shares where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_settlements_from', count(*)
from public.split_settlements where from_user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_settlements_to', count(*)
from public.split_settlements where to_user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
union all select 'split_invites_sent', count(*)
from public.split_invitations where invited_by = '36a2c461-9574-43bd-a44d-844b01dd2462'
order by tbl;


-- -----------------------------------------------------------------------------
-- D) Profile + gamification peek
-- -----------------------------------------------------------------------------
select id, name, email, phone, referral_code, subscription_tier, created_at
from public.users
where id = '36a2c461-9574-43bd-a44d-844b01dd2462';

select *
from public.gamification
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462';


-- -----------------------------------------------------------------------------
-- E) Analyse snapshot (top-level keys only)
-- Note: this user may have snapshot rows while user_analysis is empty.
-- -----------------------------------------------------------------------------
select
  user_id,
  updated_at,
  (
    select array_agg(key order by key)
    from jsonb_object_keys(payload) as key
  ) as payload_top_keys
from public.user_analyse_snapshots
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462';


-- -----------------------------------------------------------------------------
-- F) Encrypted financial blob (metadata only — not plaintext)
-- App-level AES-GCM; needs ENCRYPTION_KEY in the app to decrypt.
-- -----------------------------------------------------------------------------
select
  user_id,
  encryption_version,
  updated_at,
  length(encrypted_data::text) as ciphertext_len
from public.user_financial_data
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462';


-- -----------------------------------------------------------------------------
-- G) Expense tracker — all rows
-- -----------------------------------------------------------------------------
select
  date,
  amount,
  category,
  subcategory,
  description,
  bucket,
  payment_method,
  payment_card_label,
  month,
  year,
  created_at
from public.expense_transactions
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
order by date desc, created_at desc;

-- If payment_card_label errors, use:
-- select date, amount, category, subcategory, description, bucket,
--        payment_method, month, year, created_at
-- from public.expense_transactions
-- where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
-- order by date desc, created_at desc;


-- -----------------------------------------------------------------------------
-- H) Expense tracker — summaries
-- -----------------------------------------------------------------------------
select year, month, count(*) as txn_count, sum(amount) as total_amount
from public.expense_transactions
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
group by year, month
order by year desc, month desc;

select category, count(*) as txn_count, sum(amount) as total_amount
from public.expense_transactions
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462'
group by category
order by total_amount desc;


-- -----------------------------------------------------------------------------
-- I) Tracker consent + credit cards
-- -----------------------------------------------------------------------------
select * from public.tracker_consent
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462';

select id, nickname, last4, billing_day, due_day, created_at
from public.user_credit_cards
where user_id = '36a2c461-9574-43bd-a44d-844b01dd2462';


-- =============================================================================
-- Quick map (what stores what)
-- =============================================================================
-- auth.users              login (password hashed by Supabase)
-- users                   profile, referral_code, tier
-- user_analysis           analyse profile/result JSON (plaintext)
-- user_analyse_snapshots  analyse backup blob (plaintext JSON)
-- user_financial_data     encrypted health payload (AES-GCM)
-- gamification            FK balance / streak
-- fk_transactions         FK earn/spend log
-- expense_transactions    tracker spends (plaintext rows — normal)
-- tracker_consent         tracker consent flag
-- user_credit_cards       card nicknames + optional last4
-- financial_obligations   bills calendar
-- obligation_checklist    monthly checklist instances
-- user_planned_investments  consented Fix Plan SIP reminders (intended moves — sensitive)
-- user_policies           insurance policy vault
-- split_*                 groups / expenses / shares / invites / settlements
-- referrals               referrer_id / referred_id
-- push_subscriptions      web push keys
-- user_notifications      in-app tips / alerts
-- user_tip_history        tips already delivered
-- =============================================================================
