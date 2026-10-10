-- FinKoin (FK) balances could be set from the browser: gamification,
-- fk_transactions and users.fk_balance were all writable by their owner, so
-- anyone could give themselves any balance and top the public leaderboard.
--
-- Now only the server changes them. Signed-in users keep read access; the
-- daily-login streak, referral rewards and feedback rewards go through API
-- routes that call the functions below with the service role.

-- ── Award FK once per (user, reason, reference) ─────────────────────────

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

  -- Accounts from before the signup trigger may have no row: start them on
  -- the usual 50 FK signup bonus.
  INSERT INTO public.gamification (user_id, fk_balance, total_earned, badges, streak_days)
  VALUES (p_user_id, 50, 50, '[]'::jsonb, 0)
  ON CONFLICT (user_id) DO NOTHING;

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

-- ── Daily login: streak + 5 FK once per day ──────────────────────────────

CREATE OR REPLACE FUNCTION public.record_daily_login(p_user_id uuid, p_today date)
RETURNS TABLE (
  fk_balance integer,
  total_earned integer,
  streak_days integer,
  last_login date,
  badges jsonb,
  awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_streak integer;
  v_awarded integer := 0;
BEGIN
  INSERT INTO public.gamification (user_id, fk_balance, total_earned, badges, streak_days, last_login)
  VALUES (p_user_id, 50, 50, '[]'::jsonb, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

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

  IF public.award_fk(p_user_id, 5, 'daily_login', p_today::text) THEN
    v_awarded := 5;
  END IF;

  RETURN QUERY
  SELECT g.fk_balance, g.total_earned, g.streak_days, g.last_login, g.badges, v_awarded
  FROM public.gamification g
  WHERE g.user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_fk(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_daily_login(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_fk(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_daily_login(uuid, date) TO service_role;

-- ── Read-only for users ──────────────────────────────────────────────────

REVOKE INSERT, UPDATE, DELETE ON public.gamification FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fk_transactions FROM anon, authenticated;

-- users stays owner-editable (profile), but fk_balance joins the columns
-- only the server may change (see 043).
CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  caller text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
BEGIN
  -- Only API callers using the anon / authenticated roles are restricted.
  IF caller IS NULL OR caller NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.subscription_tier, 'free') <> 'free'
       OR coalesce((to_jsonb(NEW) ->> 'is_admin')::boolean, false)
       OR coalesce((to_jsonb(NEW) ->> 'fk_balance')::integer, 0) > 50 THEN
      RAISE EXCEPTION 'subscription_tier, is_admin and fk_balance can only be set by the server'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR (to_jsonb(NEW) -> 'is_admin') IS DISTINCT FROM (to_jsonb(OLD) -> 'is_admin')
     OR (to_jsonb(NEW) -> 'fk_balance') IS DISTINCT FROM (to_jsonb(OLD) -> 'fk_balance') THEN
    RAISE EXCEPTION 'subscription_tier, is_admin and fk_balance can only be changed by the server'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
