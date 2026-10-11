-- Premium badge for every leaderboard row, so people can see who else has it.
--
-- Same rule as lib/theme.ts `isPremiumEligible`: all-time top 10 by points,
-- or a generated report plus a 90-day streak. Only the yes/no is exposed;
-- whether someone has a report stays private.

CREATE OR REPLACE FUNCTION private.premium_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.user_id
  FROM private.leaderboard_points_rows('-infinity'::timestamptz) r
  WHERE r.rank <= 10
  UNION
  SELECT g.user_id
  FROM public.gamification g
  JOIN public.user_analyse_snapshots s ON s.user_id = g.user_id
  WHERE g.streak_days >= 90
    AND jsonb_typeof(s.payload -> 'result') = 'object';
$$;

REVOKE ALL ON FUNCTION private.premium_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.premium_user_ids() TO anon, authenticated, service_role;

-- Same columns as 050, plus is_premium at the end.
CREATE OR REPLACE VIEW public.leaderboard_view
WITH (security_invoker = on) AS
  SELECT r.*, (r.user_id IN (SELECT private.premium_user_ids())) AS is_premium
  FROM private.leaderboard_points_rows(private.ist_month_start(now())) r;

CREATE OR REPLACE VIEW public.leaderboard_all_view
WITH (security_invoker = on) AS
  SELECT r.*, (r.user_id IN (SELECT private.premium_user_ids())) AS is_premium
  FROM private.leaderboard_points_rows('-infinity'::timestamptz) r;

GRANT SELECT ON public.leaderboard_view, public.leaderboard_all_view TO anon, authenticated, service_role;
