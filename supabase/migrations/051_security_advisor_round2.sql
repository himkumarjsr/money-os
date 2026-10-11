-- Security Advisor warnings after 050. Behaviour is unchanged for the apps.
--
-- 1. private.ist_month_start had no fixed search_path.
-- 2. admin_fk_summary, generate_monthly_checklist and get_split_balances
--    were SECURITY DEFINER functions callable by signed-in users.
--    - The checklist and split balances only touch rows RLS already lets
--      the caller read or write, so they now run with the caller's rights.
--    - The admin summary must read every balance, so its owner-rights part
--      moves to a private function behind an invoker wrapper (as in 048).

-- ── 1. Month helper: fixed search_path ──────────────────────────────────

CREATE OR REPLACE FUNCTION private.ist_month_start(p_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT date_trunc('month', p_at AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
$$;

-- ── 2a. Monthly checklist: caller's rights (RLS: own rows only) ─────────

ALTER FUNCTION public.generate_monthly_checklist(uuid, date) SECURITY INVOKER;

-- ── 2b. Split balances: caller's rights (RLS: group members only) ───────

CREATE OR REPLACE FUNCTION public.get_split_balances(p_group_id uuid)
RETURNS TABLE(from_email text, from_name text, to_email text, to_name text, amount numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT private.split_is_active_member(p_group_id) THEN
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
$$;

-- ── 2c. Admin FK summary: owner rights in private, invoker wrapper ──────

CREATE OR REPLACE FUNCTION private.admin_fk_summary_rows()
RETURNS TABLE (
  outstanding_fk integer,
  outstanding_inr numeric,
  issued_this_month integer,
  issued_last_month integer,
  monthly_budget_fk integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := private.ist_month_start(now());
  v_prev timestamptz := private.ist_month_start(v_start - interval '1 day');
  v_outstanding integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND is_admin) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(sum(g.fk_balance), 0)::integer INTO v_outstanding FROM public.gamification g;

  RETURN QUERY SELECT
    v_outstanding,
    round(v_outstanding / 10.0, 2),
    (SELECT coalesce(sum(amount), 0)::integer FROM public.fk_transactions
      WHERE amount > 0 AND created_at >= v_start),
    (SELECT coalesce(sum(amount), 0)::integer FROM public.fk_transactions
      WHERE amount > 0 AND created_at >= v_prev AND created_at < v_start),
    (SELECT s.monthly_budget_fk FROM private.fk_settings s WHERE s.id);
END;
$$;

REVOKE ALL ON FUNCTION private.admin_fk_summary_rows() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_fk_summary_rows() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_fk_summary()
RETURNS TABLE (
  outstanding_fk integer,
  outstanding_inr numeric,
  issued_this_month integer,
  issued_last_month integer,
  monthly_budget_fk integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.admin_fk_summary_rows();
$$;
