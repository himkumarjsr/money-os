-- Points, new FK rules and the monthly leaderboard.
--
-- Points measure how actively someone uses Finkoin. They rank the
-- leaderboard, reset each month (India time) and can never be spent. FK is
-- the scarce coin, usable only as a discount on Finkoin products
-- (10 FK = ₹1). Every amount here matches lib/fkRewards.ts.
--
-- Points are awarded by triggers on the tables the apps already write to.
-- These triggers never block the user's own write: a failure is only logged.

-- ── Points ledger ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  reason text NOT NULL,
  reference_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS points_transactions_once
  ON public.points_transactions (user_id, reason, reference_id);
CREATE INDEX IF NOT EXISTS points_transactions_created_at
  ON public.points_transactions (created_at, user_id);

ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS points_transactions_read_own ON public.points_transactions;
CREATE POLICY points_transactions_read_own ON public.points_transactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.points_transactions FROM anon, authenticated;

-- ── Settings: optional monthly FK budget (NULL = no limit) ──────────────

CREATE TABLE IF NOT EXISTS private.fk_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  monthly_budget_fk integer CHECK (monthly_budget_fk IS NULL OR monthly_budget_fk >= 0)
);
INSERT INTO private.fk_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
REVOKE ALL ON private.fk_settings FROM PUBLIC, anon, authenticated;

-- Start of the India-time month containing p_at.
CREATE OR REPLACE FUNCTION private.ist_month_start(p_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('month', p_at AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
$$;

-- ── Award points (once per reference, optional daily cap per reason) ────

CREATE OR REPLACE FUNCTION private.award_points(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_reference_id text,
  p_daily_cap integer DEFAULT NULL,
  p_at timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (p_at AT TIME ZONE 'Asia/Kolkata')::date;
  v_used integer;
  v_points integer := p_points;
  v_rows integer;
BEGIN
  IF p_user_id IS NULL OR p_points IS NULL OR p_points <= 0 THEN
    RETURN 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('points|' || p_user_id::text || '|' || p_reason));

  IF EXISTS (
    SELECT 1 FROM public.points_transactions
    WHERE user_id = p_user_id AND reason = p_reason AND reference_id = p_reference_id
  ) THEN
    RETURN 0;
  END IF;

  IF p_daily_cap IS NOT NULL THEN
    SELECT coalesce(sum(points), 0) INTO v_used
    FROM public.points_transactions
    WHERE user_id = p_user_id
      AND reason = p_reason
      AND created_at >= (v_day::timestamp AT TIME ZONE 'Asia/Kolkata')
      AND created_at < ((v_day + 1)::timestamp AT TIME ZONE 'Asia/Kolkata');
    v_points := least(p_points, p_daily_cap - v_used);
    IF v_points <= 0 THEN
      RETURN 0;
    END IF;
  END IF;

  INSERT INTO public.points_transactions (user_id, points, reason, reference_id, created_at)
  VALUES (p_user_id, v_points, p_reason, p_reference_id, p_at)
  ON CONFLICT (user_id, reason, reference_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN CASE WHEN v_rows > 0 THEN v_points ELSE 0 END;
END;
$$;

-- ── award_fk: same as 049, plus the optional monthly budget ─────────────

CREATE OR REPLACE FUNCTION public.award_fk(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_budget integer;
  v_issued integer;
BEGIN
  -- Serialise concurrent awards for the same key so a double request can't
  -- pay twice (existing data has a few duplicates, so no unique index).
  PERFORM pg_advisory_xact_lock(
    hashtext(p_user_id::text || '|' || p_reason || '|' || coalesce(p_reference_id, ''))
  );

  IF EXISTS (
    SELECT 1 FROM public.fk_transactions
    WHERE user_id = p_user_id
      AND reason = p_reason
      AND reference_id IS NOT DISTINCT FROM p_reference_id
  ) THEN
    RETURN false;
  END IF;

  -- Pause rewards once this month's FK would pass the budget, if one is set.
  SELECT monthly_budget_fk INTO v_budget FROM private.fk_settings WHERE id;
  IF v_budget IS NOT NULL AND p_amount > 0 THEN
    SELECT coalesce(sum(amount), 0) INTO v_issued
    FROM public.fk_transactions
    WHERE amount > 0 AND created_at >= private.ist_month_start(now());
    IF v_issued + p_amount > v_budget THEN
      RETURN false;
    END IF;
  END IF;

  -- Accounts from before the signup trigger may have no row: start them on
  -- the usual 50 FK signup bonus.
  INSERT INTO public.gamification (user_id, fk_balance, total_earned, badges, streak_days)
  VALUES (p_user_id, 50, 50, '[]'::jsonb, 0)
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    PERFORM public.record_welcome_bonus(p_user_id);
  END IF;

  INSERT INTO public.fk_transactions (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  UPDATE public.gamification
  SET fk_balance = coalesce(fk_balance, 0) + p_amount,
      total_earned = coalesce(total_earned, 0) + greatest(p_amount, 0),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING fk_balance INTO v_balance;

  UPDATE public.users SET fk_balance = v_balance WHERE id = p_user_id;
  RETURN true;
END;
$$;

-- ── One-off FK milestones ───────────────────────────────────────────────

-- 100 FK once the user has a first expense and a first health score.
CREATE OR REPLACE FUNCTION private.check_setup_bonus(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fk_transactions WHERE user_id = p_user_id AND reason = 'setup_complete') THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.expense_transactions WHERE user_id = p_user_id)
     AND EXISTS (
       SELECT 1 FROM public.user_analysis
       WHERE user_id = p_user_id AND analysis_result IS NOT NULL
     ) THEN
    PERFORM public.award_fk(p_user_id, 100, 'setup_complete', 'once');
  END IF;
END;
$$;

-- A referral pays out once the new user adds their first expense: 200 FK to
-- the referrer (at most 10 referrals a month), 100 FK to the new user and
-- 100 points to the referrer.
CREATE OR REPLACE FUNCTION private.check_referral_activation(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_paid_this_month integer;
BEGIN
  SELECT r.referrer_id INTO v_referrer
  FROM public.referrals r
  WHERE r.referred_id = p_user_id
  ORDER BY r.signed_up_at ASC NULLS LAST
  LIMIT 1;

  IF v_referrer IS NULL OR v_referrer = p_user_id THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.expense_transactions WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fk_transactions
    WHERE user_id = p_user_id AND reason = 'referral_reward_new_user'
  ) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_paid_this_month
  FROM public.fk_transactions
  WHERE user_id = v_referrer
    AND reason = 'referral_reward_referrer'
    AND created_at >= private.ist_month_start(now());
  IF v_paid_this_month < 10 THEN
    PERFORM public.award_fk(v_referrer, 200, 'referral_reward_referrer', p_user_id::text);
  END IF;

  PERFORM public.award_fk(p_user_id, 100, 'referral_reward_new_user', v_referrer::text);
  PERFORM private.award_points(v_referrer, 100, 'referral_active', p_user_id::text);

  UPDATE public.referrals SET tokens_awarded = true WHERE referred_id = p_user_id;
END;
$$;

-- For the referral API: pays at once if the new user already has an expense.
CREATE OR REPLACE FUNCTION public.check_referral_activation(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.check_referral_activation(p_user_id);
$$;

-- ── Activity triggers ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.points_on_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM private.award_points(NEW.user_id, 2, 'expense', NEW.id::text, 20);
    PERFORM private.award_points(NEW.user_id, 20, 'first_use', 'tracker');
    PERFORM private.check_setup_bonus(NEW.user_id);
    PERFORM private.check_referral_activation(NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'points_on_expense failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.points_on_split()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := coalesce(NEW.created_by, NEW.paid_by_user_id);
BEGIN
  IF coalesce(NEW.is_settlement, false) THEN
    RETURN NULL;
  END IF;
  BEGIN
    PERFORM private.award_points(v_user, 3, 'split', NEW.id::text, 15);
    PERFORM private.award_points(v_user, 20, 'first_use', 'split');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'points_on_split failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

-- Policies, planned investments, cards and bills. Inserts always count;
-- updates count only when the user made them (not background jobs).
CREATE OR REPLACE FUNCTION private.points_on_portfolio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature text := CASE TG_TABLE_NAME
    WHEN 'user_policies' THEN 'policies'
    WHEN 'user_planned_investments' THEN 'investments'
    WHEN 'user_credit_cards' THEN 'cards'
    WHEN 'financial_obligations' THEN 'bills'
    ELSE TG_TABLE_NAME
  END;
  v_day text := (now() AT TIME ZONE 'Asia/Kolkata')::date::text;
BEGIN
  IF TG_OP = 'UPDATE' AND (SELECT auth.uid()) IS DISTINCT FROM NEW.user_id THEN
    RETURN NULL;
  END IF;
  BEGIN
    PERFORM private.award_points(
      NEW.user_id, 5, 'portfolio_update',
      v_feature || ':' || NEW.id::text || ':' || v_day, 20
    );
    IF TG_OP = 'INSERT' THEN
      PERFORM private.award_points(NEW.user_id, 20, 'first_use', v_feature);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'points_on_portfolio failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

-- A new health score: 20 points once per week (India time).
CREATE OR REPLACE FUNCTION private.points_on_analyse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.analysis_result IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.analysis_result IS NOT DISTINCT FROM OLD.analysis_result) THEN
    RETURN NULL;
  END IF;
  BEGIN
    PERFORM private.award_points(
      NEW.user_id, 20, 'analyse',
      to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'IYYY-IW')
    );
    PERFORM private.award_points(NEW.user_id, 20, 'first_use', 'analyse');
    PERFORM private.check_setup_bonus(NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'points_on_analyse failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS points_on_expense ON public.expense_transactions;
CREATE TRIGGER points_on_expense
  AFTER INSERT ON public.expense_transactions
  FOR EACH ROW EXECUTE FUNCTION private.points_on_expense();

DROP TRIGGER IF EXISTS points_on_split ON public.split_expenses;
CREATE TRIGGER points_on_split
  AFTER INSERT ON public.split_expenses
  FOR EACH ROW EXECUTE FUNCTION private.points_on_split();

DROP TRIGGER IF EXISTS points_on_portfolio ON public.user_policies;
CREATE TRIGGER points_on_portfolio
  AFTER INSERT OR UPDATE ON public.user_policies
  FOR EACH ROW EXECUTE FUNCTION private.points_on_portfolio();

DROP TRIGGER IF EXISTS points_on_portfolio ON public.user_planned_investments;
CREATE TRIGGER points_on_portfolio
  AFTER INSERT OR UPDATE ON public.user_planned_investments
  FOR EACH ROW EXECUTE FUNCTION private.points_on_portfolio();

DROP TRIGGER IF EXISTS points_on_portfolio ON public.user_credit_cards;
CREATE TRIGGER points_on_portfolio
  AFTER INSERT OR UPDATE ON public.user_credit_cards
  FOR EACH ROW EXECUTE FUNCTION private.points_on_portfolio();

DROP TRIGGER IF EXISTS points_on_portfolio ON public.financial_obligations;
CREATE TRIGGER points_on_portfolio
  AFTER INSERT OR UPDATE ON public.financial_obligations
  FOR EACH ROW EXECUTE FUNCTION private.points_on_portfolio();

DROP TRIGGER IF EXISTS points_on_analyse ON public.user_analysis;
CREATE TRIGGER points_on_analyse
  AFTER INSERT OR UPDATE OF analysis_result ON public.user_analysis
  FOR EACH ROW EXECUTE FUNCTION private.points_on_analyse();

-- ── Monthly prizes: top 3 of last month get 500 / 250 / 100 FK ──────────

CREATE OR REPLACE FUNCTION private.pay_monthly_prizes(p_today date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_key text := to_char(v_month, 'YYYY-MM');
  v_prizes integer[] := ARRAY[500, 250, 100];
  v_place integer := 0;
  r record;
BEGIN
  -- Points started in October 2026; earlier months have no contest.
  IF v_month < DATE '2026-10-01' THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.fk_transactions WHERE reason = 'monthly_top3' AND reference_id = v_key) THEN
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('monthly_top3|' || v_key));
  IF EXISTS (SELECT 1 FROM public.fk_transactions WHERE reason = 'monthly_top3' AND reference_id = v_key) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT p.user_id
    FROM public.points_transactions p
    WHERE p.created_at >= (v_month::timestamp AT TIME ZONE 'Asia/Kolkata')
      AND p.created_at < ((v_month + interval '1 month')::timestamp AT TIME ZONE 'Asia/Kolkata')
    GROUP BY p.user_id
    ORDER BY sum(p.points) DESC, max(p.created_at) ASC
    LIMIT 3
  LOOP
    v_place := v_place + 1;
    PERFORM public.award_fk(r.user_id, v_prizes[v_place], 'monthly_top3', v_key);
    UPDATE public.gamification
    SET badges = coalesce(badges, '[]'::jsonb)
          || to_jsonb('Top 3 · ' || to_char(v_month, 'Mon YYYY')),
        updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;

-- ── Daily login: points instead of FK, streak rewards, month-end prizes ─

DROP FUNCTION IF EXISTS public.record_daily_login(uuid, date);
CREATE FUNCTION public.record_daily_login(p_user_id uuid, p_today date)
RETURNS TABLE (
  fk_balance integer,
  total_earned integer,
  streak_days integer,
  last_login date,
  badges jsonb,
  awarded integer,
  points_awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_streak integer;
  v_awarded integer := 0;
  v_points integer := 0;
BEGIN
  BEGIN
    PERFORM private.pay_monthly_prizes(p_today);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pay_monthly_prizes failed: %', SQLERRM;
  END;

  INSERT INTO public.gamification (user_id, fk_balance, total_earned, badges, streak_days, last_login)
  VALUES (p_user_id, 50, 50, '[]'::jsonb, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    PERFORM public.record_welcome_bonus(p_user_id);
  END IF;

  SELECT g.last_login, coalesce(g.streak_days, 0)
  INTO v_last, v_streak
  FROM public.gamification g
  WHERE g.user_id = p_user_id
  FOR UPDATE;

  IF v_last IS DISTINCT FROM p_today THEN
    v_streak := CASE WHEN v_last = p_today - 1 THEN v_streak + 1 ELSE 1 END;
    UPDATE public.gamification g
    SET streak_days = v_streak, last_login = p_today, updated_at = now()
    WHERE g.user_id = p_user_id;
  END IF;

  v_points := v_points + private.award_points(p_user_id, 5, 'daily_login', p_today::text);
  IF v_streak = 7 THEN
    v_points := v_points + private.award_points(p_user_id, 50, 'streak_7', p_today::text);
  END IF;
  IF v_streak > 0 AND v_streak % 30 = 0 THEN
    v_points := v_points + private.award_points(p_user_id, 200, 'streak_30', p_today::text);
    IF public.award_fk(p_user_id, 50, 'streak_30', p_today::text) THEN
      v_awarded := 50;
    END IF;
  END IF;

  RETURN QUERY
  SELECT g.fk_balance, g.total_earned, g.streak_days, g.last_login, g.badges, v_awarded, v_points
  FROM public.gamification g
  WHERE g.user_id = p_user_id;
END;
$$;

-- ── Leaderboards: this month and all time, ranked by points ─────────────

DROP VIEW IF EXISTS public.leaderboard_view;
DROP FUNCTION IF EXISTS private.leaderboard_rows();

CREATE OR REPLACE FUNCTION private.leaderboard_points_rows(p_since timestamptz)
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  fk_balance integer,
  streak_days integer,
  badges jsonb,
  rank bigint,
  percentile numeric,
  points integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT t.user_id, sum(t.points)::integer AS pts, max(t.created_at) AS last_at
    FROM public.points_transactions t
    WHERE t.created_at >= p_since
    GROUP BY t.user_id
  )
  SELECT p.user_id,
    u.name,
    u.avatar_url,
    coalesce(g.fk_balance, 0),
    coalesce(g.streak_days, 0),
    coalesce(g.badges, '[]'::jsonb),
    rank() OVER (ORDER BY p.pts DESC) AS rank,
    round((rank() OVER (ORDER BY p.pts DESC))::numeric
      / NULLIF(count(*) OVER (), 0)::numeric * 100, 0) AS percentile,
    p.pts
  FROM p
  JOIN public.users u ON u.id = p.user_id
  LEFT JOIN public.gamification g ON g.user_id = p.user_id
  ORDER BY p.pts DESC, p.last_at ASC;
$$;

REVOKE ALL ON FUNCTION private.leaderboard_points_rows(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.leaderboard_points_rows(timestamptz) TO anon, authenticated, service_role;

CREATE VIEW public.leaderboard_view
WITH (security_invoker = on) AS
  SELECT * FROM private.leaderboard_points_rows(private.ist_month_start(now()));

CREATE VIEW public.leaderboard_all_view
WITH (security_invoker = on) AS
  SELECT * FROM private.leaderboard_points_rows('-infinity'::timestamptz);

GRANT SELECT ON public.leaderboard_view, public.leaderboard_all_view TO anon, authenticated, service_role;

-- ── Admin: what the FK in circulation is worth ──────────────────────────

CREATE OR REPLACE FUNCTION public.admin_fk_summary()
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

-- ── Grants ──────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION private.ist_month_start(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.ist_month_start(timestamptz) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION private.award_points(uuid, integer, text, text, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.check_setup_bonus(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.check_referral_activation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.pay_monthly_prizes(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.points_on_expense() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.points_on_split() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.points_on_portfolio() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.points_on_analyse() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_referral_activation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_referral_activation(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_daily_login(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_login(uuid, date) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_fk_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_fk_summary() TO authenticated, service_role;

-- ── Backfill points from existing activity (no FK is paid here) ─────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT 'expense' AS kind, e.user_id, e.id::text AS ref, e.created_at AS at, NULL::text AS feature
      FROM public.expense_transactions e
    UNION ALL
    SELECT 'split', coalesce(s.created_by, s.paid_by_user_id), s.id::text, s.created_at, NULL
      FROM public.split_expenses s
      WHERE NOT coalesce(s.is_settlement, false) AND NOT coalesce(s.is_deleted, false)
    UNION ALL
    SELECT 'portfolio', p.user_id, p.id::text, p.created_at, 'policies' FROM public.user_policies p
    UNION ALL
    SELECT 'portfolio', i.user_id, i.id::text, i.created_at, 'investments' FROM public.user_planned_investments i
    UNION ALL
    SELECT 'portfolio', c.user_id, c.id::text, c.created_at, 'cards' FROM public.user_credit_cards c
    UNION ALL
    SELECT 'portfolio', o.user_id, o.id::text, o.created_at, 'bills' FROM public.financial_obligations o
    UNION ALL
    SELECT 'analyse', a.user_id, NULL, coalesce(a.updated_at, a.created_at), NULL
      FROM public.user_analysis a WHERE a.analysis_result IS NOT NULL
    UNION ALL
    SELECT 'login', f.user_id, f.reference_id, f.created_at, NULL
      FROM public.fk_transactions f WHERE f.reason = 'daily_login'
    ORDER BY 4
  LOOP
    CONTINUE WHEN r.user_id IS NULL OR r.at IS NULL;
    IF r.kind = 'expense' THEN
      PERFORM private.award_points(r.user_id, 2, 'expense', r.ref, 20, r.at);
      PERFORM private.award_points(r.user_id, 20, 'first_use', 'tracker', NULL, r.at);
    ELSIF r.kind = 'split' THEN
      PERFORM private.award_points(r.user_id, 3, 'split', r.ref, 15, r.at);
      PERFORM private.award_points(r.user_id, 20, 'first_use', 'split', NULL, r.at);
    ELSIF r.kind = 'portfolio' THEN
      PERFORM private.award_points(
        r.user_id, 5, 'portfolio_update',
        r.feature || ':' || r.ref || ':' || (r.at AT TIME ZONE 'Asia/Kolkata')::date::text, 20, r.at
      );
      PERFORM private.award_points(r.user_id, 20, 'first_use', r.feature, NULL, r.at);
    ELSIF r.kind = 'analyse' THEN
      PERFORM private.award_points(
        r.user_id, 20, 'analyse',
        to_char((r.at AT TIME ZONE 'Asia/Kolkata')::date, 'IYYY-IW'), NULL, r.at
      );
      PERFORM private.award_points(r.user_id, 20, 'first_use', 'analyse', NULL, r.at);
    ELSIF r.kind = 'login' AND r.ref IS NOT NULL THEN
      PERFORM private.award_points(r.user_id, 5, 'daily_login', r.ref, NULL, r.at);
    END IF;
  END LOOP;
END;
$$;
