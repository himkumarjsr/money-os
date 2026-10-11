-- Every FK coin now has a transaction row.
--
-- The 50 FK welcome bonus was set straight into gamification.fk_balance when
-- an account was created, with no fk_transactions row, so the ledger never
-- added up to the balance. New accounts now log it as 'welcome_bonus', and
-- existing accounts get the missing row backfilled. Balances do not change:
-- the bonus is already in them.

-- ── Log the welcome bonus (ledger only; the balance already includes it) ──

CREATE OR REPLACE FUNCTION public.record_welcome_bonus(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fk_transactions (user_id, amount, reason, reference_id)
  SELECT p_user_id, 50, 'welcome_bonus', 'signup'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.fk_transactions
    WHERE user_id = p_user_id AND reason = 'welcome_bonus'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_welcome_bonus(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_welcome_bonus(uuid) TO service_role;

-- ── Signup trigger: same as before, plus the ledger row ─────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (
    id, email, name,
    referral_code, subscription_tier,
    fk_balance
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    upper(substring(
      replace(new.id::text, '-', ''), 1, 8
    )),
    'free',
    50
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.gamification (
    user_id, fk_balance,
    badges, streak_days, total_earned
  )
  VALUES (
    new.id, 50, '[]', 0, 50
  )
  ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    PERFORM public.record_welcome_bonus(new.id);
  END IF;

  INSERT INTO public.user_stats (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$function$;

-- ── Late-created rows (accounts from before the trigger) log it too ─────

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

  IF public.award_fk(p_user_id, 5, 'daily_login', p_today::text) THEN
    v_awarded := 5;
  END IF;

  RETURN QUERY
  SELECT g.fk_balance, g.total_earned, g.streak_days, g.last_login, g.badges, v_awarded
  FROM public.gamification g
  WHERE g.user_id = p_user_id;
END;
$$;

-- ── Backfill existing accounts ──────────────────────────────────────────

INSERT INTO public.fk_transactions (user_id, amount, reason, reference_id, created_at)
SELECT g.user_id, 50, 'welcome_bonus', 'signup', coalesce(g.created_at, now())
FROM public.gamification g
WHERE NOT EXISTS (
  SELECT 1 FROM public.fk_transactions t
  WHERE t.user_id = g.user_id AND t.reason = 'welcome_bonus'
);
