-- Clears the remaining Supabase Security Advisor findings (10 Oct 2026).
-- Same behaviour for the web and mobile apps: the leaderboard still lists
-- everyone, Split rules still check membership; the privileged helpers
-- just move out of the public API so they can't be called over REST.
--
-- Left as-is on purpose:
--   generate_monthly_checklist / get_split_balances: called by the apps via
--     rpc(), and both refuse callers acting on someone else's data (044).
--   Leaked password protection: Supabase Pro plan feature.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ── 1. Leaderboard: SECURITY DEFINER view → invoker view over a private fn ─
-- The view must read every user's FK balance and display name, which RLS
-- hides from other users. The owner-rights part now lives in a function
-- outside the API schema, and the view runs with the caller's rights.

CREATE OR REPLACE FUNCTION private.leaderboard_rows()
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  fk_balance integer,
  streak_days integer,
  badges jsonb,
  rank bigint,
  percentile numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.user_id,
    u.name,
    u.avatar_url,
    g.fk_balance,
    g.streak_days,
    g.badges,
    rank() OVER (ORDER BY g.fk_balance DESC) AS rank,
    round((rank() OVER (ORDER BY g.fk_balance DESC))::numeric
      / NULLIF(count(*) OVER (), 0)::numeric * 100, 0) AS percentile
  FROM public.gamification g
  JOIN public.users u ON u.id = g.user_id
  WHERE g.fk_balance > 0
  ORDER BY g.fk_balance DESC;
$$;

REVOKE ALL ON FUNCTION private.leaderboard_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.leaderboard_rows() TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.leaderboard_view
WITH (security_invoker = on) AS
  SELECT * FROM private.leaderboard_rows();

-- ── 2. Split RLS helpers → private schema ───────────────────────────────

CREATE OR REPLACE FUNCTION private.split_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(email) FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.split_is_active_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.split_group_members m
    WHERE m.group_id = p_group_id
      AND lower(m.email) = private.split_current_user_email()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.split_is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.split_group_members m
    WHERE m.group_id = p_group_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.split_current_user_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.split_is_active_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.split_is_group_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.split_current_user_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.split_is_active_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.split_is_group_admin(uuid) TO authenticated, service_role;

-- Point every policy at the private copies (rule text otherwise unchanged).
DO $$
DECLARE
  p record;
  stmt text;
  fix text := '(?<![.\w])(split_current_user_email|split_is_active_member|split_is_group_admin)\(';
BEGIN
  FOR p IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ~ fix OR with_check ~ fix)
  LOOP
    stmt := format('ALTER POLICY %I ON public.%I', p.policyname, p.tablename);
    IF p.qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || regexp_replace(p.qual, fix, 'private.\1(', 'g') || ')';
    END IF;
    IF p.with_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || regexp_replace(p.with_check, fix, 'private.\1(', 'g') || ')';
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- The public copies stay for get_split_balances (owner rights) but are no
-- longer callable over the REST API.
REVOKE EXECUTE ON FUNCTION public.split_current_user_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.split_is_active_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.split_is_group_admin(uuid) FROM PUBLIC, anon, authenticated;

-- ── 3. feedback: drop "always true" insert policies ─────────────────────
-- All feedback writes go through /api/feedback with the service role,
-- which bypasses RLS; nothing inserts with the anon/user key.

DROP POLICY IF EXISTS feedback_anon_insert ON public.feedback;
DROP POLICY IF EXISTS feedback_insert ON public.feedback;

-- ── 4. finance_tips: explicit read policy ───────────────────────────────
-- Server routes read it with the service role; tips are public content.

DROP POLICY IF EXISTS finance_tips_read_active ON public.finance_tips;
CREATE POLICY finance_tips_read_active ON public.finance_tips
  FOR SELECT TO authenticated
  USING (is_active = true);
