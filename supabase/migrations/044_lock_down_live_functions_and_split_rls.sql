-- Fixes from the Supabase Security Advisor and a review of the live policies
-- (10 Oct 2026). Every change keeps the web and mobile flows working:
-- they only stop callers acting on users or groups that aren't theirs.

-- ── RPC functions that run with owner rights ────────────────────────────

-- Anyone (even signed out) could read any Split group's member emails and
-- balances by passing its id. Now only active members get rows back.
-- Also fixes "column reference amount is ambiguous", which made every call
-- fail (the app computes balances in /api/split/balances instead).
CREATE OR REPLACE FUNCTION public.get_split_balances(p_group_id uuid)
RETURNS TABLE(from_email text, from_name text, to_email text, to_name text, amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.split_is_active_member(p_group_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH
  paid AS (
    SELECT
      e.paid_by_email AS email,
      e.paid_by_name AS name,
      SUM(e.amount) AS total_paid
    FROM public.split_expenses e
    WHERE e.group_id = p_group_id
    AND e.is_settlement = false
    AND COALESCE(e.is_deleted, false) = false
    GROUP BY e.paid_by_email, e.paid_by_name
  ),
  owed AS (
    SELECT
      ses.email,
      ses.display_name AS name,
      SUM(ses.share_amount) AS total_owed
    FROM public.split_expense_shares ses
    JOIN public.split_expenses se
      ON se.id = ses.expense_id
    WHERE ses.group_id = p_group_id
    AND se.is_settlement = false
    AND COALESCE(se.is_deleted, false) = false
    AND ses.is_settled = false
    GROUP BY ses.email, ses.display_name
  ),
  net AS (
    SELECT
      COALESCE(p.email, o.email) AS email,
      COALESCE(p.name, o.name) AS name,
      COALESCE(p.total_paid, 0) -
        COALESCE(o.total_owed, 0) AS net
    FROM paid p
    FULL OUTER JOIN owed o
      ON p.email = o.email
  ),
  debtors AS (
    SELECT email, name, ABS(net) AS amount
    FROM net WHERE net < 0
  ),
  creditors AS (
    SELECT email, name, net AS amount
    FROM net WHERE net > 0
  )
  SELECT
    d.email AS from_email,
    d.name AS from_name,
    c.email AS to_email,
    c.name AS to_name,
    LEAST(d.amount, c.amount) AS amount
  FROM debtors d
  CROSS JOIN creditors c
  WHERE LEAST(d.amount, c.amount) > 0.01;
END;
$function$;

-- Anyone could create checklist rows for any user id. A signed-in user may
-- now only generate their own; the server (no JWT user) is unaffected.
CREATE OR REPLACE FUNCTION public.generate_monthly_checklist(p_user_id uuid, p_month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_obligation record;
  v_month_start date;
  v_month_num integer;
  v_should_include boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only generate your own checklist'
      USING ERRCODE = '42501';
  END IF;

  v_month_start := date_trunc('month', p_month)::date;
  v_month_num := EXTRACT(MONTH FROM p_month)::integer;

  FOR v_obligation IN
    SELECT * FROM public.financial_obligations
    WHERE user_id = p_user_id
    AND is_active = true
  LOOP
    v_should_include := false;

    CASE v_obligation.frequency
      WHEN 'monthly' THEN
        v_should_include := true;
      WHEN 'quarterly' THEN
        v_should_include := (v_month_num % 3 = 0);
      WHEN 'half_yearly' THEN
        v_should_include := (v_month_num % 6 = 0);
      WHEN 'yearly' THEN
        v_should_include := (v_obligation.due_month = v_month_num);
      WHEN 'one_time' THEN
        v_should_include :=
          (EXTRACT(MONTH FROM v_obligation.due_date) = v_month_num AND
           EXTRACT(YEAR FROM v_obligation.due_date) = EXTRACT(YEAR FROM p_month));
      ELSE
        v_should_include := false;
    END CASE;

    IF v_should_include THEN
      INSERT INTO public.obligation_checklist
        (user_id, obligation_id, checklist_month, expected_amount, status)
      VALUES (p_user_id, v_obligation.id, v_month_start, v_obligation.amount, 'pending')
      ON CONFLICT (user_id, obligation_id, checklist_month) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

-- Only the server (service role) calls these: the daily-tip cron, and
-- triggers. Signed-out and signed-in API callers lose EXECUTE.
REVOKE EXECUTE ON FUNCTION public.get_next_tip_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Signed-in only: the checklist RPC and Split's RLS helper functions
-- (policies call them as the signed-in user).
REVOKE EXECUTE ON FUNCTION public.generate_monthly_checklist(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_split_balances(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.split_current_user_email() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.split_is_active_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.split_is_group_admin(uuid) FROM PUBLIC, anon;

-- Pin search_path (advisor: function_search_path_mutable).
ALTER FUNCTION public.get_next_tip_for_user(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.protect_privileged_user_columns() SET search_path = public;

-- ── Split table policies ─────────────────────────────────────────────────

-- Was: any signed-in user could add any member, at any role, to any group.
-- Now: add yourself as a member (invite-code join), add yourself as admin
-- of a group you created, or be a group admin adding someone.
DROP POLICY IF EXISTS split_members_insert ON public.split_group_members;
CREATE POLICY split_members_insert ON public.split_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND role = 'member')
    OR (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.split_groups g
      WHERE g.id = group_id AND g.created_by = auth.uid()))
    OR public.split_is_group_admin(group_id)
  );

-- Was: a member could promote themselves to admin. Now members may update
-- their own row but not make it admin; admins and the creator are unchanged.
DROP POLICY IF EXISTS split_members_update ON public.split_group_members;
CREATE POLICY split_members_update ON public.split_group_members
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR public.split_is_group_admin(group_id))
  WITH CHECK (
    (user_id = auth.uid() AND role = 'member')
    OR public.split_is_group_admin(group_id)
    OR EXISTS (
      SELECT 1 FROM public.split_groups g
      WHERE g.id = group_id AND g.created_by = auth.uid())
  );

-- Was: any signed-in user could insert or edit shares in any group.
DROP POLICY IF EXISTS split_shares_insert ON public.split_expense_shares;
CREATE POLICY split_shares_insert ON public.split_expense_shares
  FOR INSERT TO authenticated
  WITH CHECK (public.split_is_active_member(group_id));

DROP POLICY IF EXISTS split_shares_update ON public.split_expense_shares;
CREATE POLICY split_shares_update ON public.split_expense_shares
  FOR UPDATE TO authenticated
  USING (public.split_is_active_member(group_id))
  WITH CHECK (public.split_is_active_member(group_id));

-- ── Other tables ─────────────────────────────────────────────────────────

-- Was: every signed-in user could read all feedback (names, cities,
-- messages). Only the server reads it; users keep their own rows and the
-- approved, featured testimonials.
DROP POLICY IF EXISTS feedback_read ON public.feedback;
CREATE POLICY feedback_read ON public.feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_approved = true AND is_featured = true));

-- Was: a user could insert a referral naming themselves as the referrer of
-- anyone. A referral row may only be created by the referred (new) user.
DROP POLICY IF EXISTS referrals_own ON public.referrals;
DROP POLICY IF EXISTS referrals_read ON public.referrals;
DROP POLICY IF EXISTS referrals_insert ON public.referrals;
DROP POLICY IF EXISTS referrals_update ON public.referrals;
CREATE POLICY referrals_read ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY referrals_insert ON public.referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referred_id AND referrer_id IS DISTINCT FROM referred_id);
CREATE POLICY referrals_update ON public.referrals
  FOR UPDATE
  USING (auth.uid() = referred_id)
  WITH CHECK (auth.uid() = referred_id);
