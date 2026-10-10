-- Performance fixes from the Supabase Performance Advisor (10 Oct 2026).
-- No change to who can read or write what: same policies, same rules,
-- just cheaper to evaluate as tables grow.

-- ── 1. Index every foreign key ──────────────────────────────────────────
-- Without these, per-user lookups and cascading deletes (account deletion)
-- scan the whole table.

CREATE INDEX IF NOT EXISTS idx_expense_transactions_payment_card_id ON public.expense_transactions (payment_card_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_user_id ON public.expense_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_user_id ON public.financial_obligations (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user_id ON public.financial_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_fk_transactions_user_id ON public.fk_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_clicks_user_id ON public.insurance_clicks (user_id);
CREATE INDEX IF NOT EXISTS idx_obligation_checklist_obligation_id ON public.obligation_checklist (obligation_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_split_expense_shares_user_id ON public.split_expense_shares (user_id);
CREATE INDEX IF NOT EXISTS idx_split_expenses_created_by ON public.split_expenses (created_by);
CREATE INDEX IF NOT EXISTS idx_split_expenses_paid_by_user_id ON public.split_expenses (paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_split_group_members_invited_by ON public.split_group_members (invited_by);
CREATE INDEX IF NOT EXISTS idx_split_group_members_user_id ON public.split_group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_split_groups_created_by ON public.split_groups (created_by);
CREATE INDEX IF NOT EXISTS idx_split_invitations_group_id ON public.split_invitations (group_id);
CREATE INDEX IF NOT EXISTS idx_split_invitations_invited_by ON public.split_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_split_settlements_from_user_id ON public.split_settlements (from_user_id);
CREATE INDEX IF NOT EXISTS idx_split_settlements_to_user_id ON public.split_settlements (to_user_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_user_id ON public.tax_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_tip_id ON public.user_notifications (tip_id);
CREATE INDEX IF NOT EXISTS idx_user_tip_history_tip_id ON public.user_tip_history (tip_id);

-- ── 2. Drop duplicate policies ──────────────────────────────────────────
-- Each pair below had the same USING rule; an ALL policy without WITH CHECK
-- reuses USING, so the surviving policy allows exactly the same rows.

DROP POLICY IF EXISTS profiles_own_data ON public.financial_profiles;      -- dup of fp_own
DROP POLICY IF EXISTS gamification_own_data ON public.gamification;       -- dup of gamification_own

-- ── 3. Evaluate auth.uid() once per query, not once per row ─────────────
-- Wrapping it in (select ...) lets Postgres cache the value. Rewrites every
-- public policy in place, so the rules themselves are untouched.

DO $$
DECLARE
  p record;
  stmt text;
BEGIN
  FOR p IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ~ 'auth\.uid\(\)' OR with_check ~ 'auth\.uid\(\)')
  LOOP
    stmt := format('ALTER POLICY %I ON public.%I', p.policyname, p.tablename);
    IF p.qual IS NOT NULL THEN
      stmt := stmt || ' USING (' ||
        regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g') || ')';
    END IF;
    IF p.with_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' ||
        regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g') || ')';
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;
