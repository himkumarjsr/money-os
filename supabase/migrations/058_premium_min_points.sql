-- Premium via the leaderboard now also needs 500+ all-time points, so a
-- small board (where everyone with any points is "top 10") doesn't hand it
-- out. Same rule as lib/theme.ts `isPremiumEligible` (PREMIUM_MIN_POINTS).
-- The views from 052 call this function, so they pick the change up as is.

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
    AND r.points >= 500
  UNION
  SELECT g.user_id
  FROM public.gamification g
  JOIN public.user_analyse_snapshots s ON s.user_id = g.user_id
  WHERE g.streak_days >= 90
    AND jsonb_typeof(s.payload -> 'result') = 'object';
$$;

REVOKE ALL ON FUNCTION private.premium_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.premium_user_ids() TO anon, authenticated, service_role;
