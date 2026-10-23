-- Analyse logs: one append-only row per generated report (form submit or a
-- profile edit from a goal card), holding the form answers, the profile,
-- every in-between number and the report itself. Used from the admin console
-- to check the calculations against real reports.
--
-- Users can only add rows for themselves and cannot read, edit or delete
-- them. Only console admins (migration 053) can read them, through
-- admin_console_analyse_logs().

CREATE TABLE IF NOT EXISTS public.analyse_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('form_submit', 'profile_edit')),
  platform text CHECK (platform IN ('web', 'pwa', 'ios', 'android')),
  app_version text CHECK (char_length(app_version) <= 40),
  -- How many numbers in this report disagree with each other.
  check_count integer NOT NULL DEFAULT 0 CHECK (check_count >= 0),
  payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 1000000)
);

CREATE INDEX IF NOT EXISTS analyse_logs_created_at_idx
  ON public.analyse_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS analyse_logs_user_created_idx
  ON public.analyse_logs (user_id, created_at DESC);

ALTER TABLE public.analyse_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analyse_logs_insert_own ON public.analyse_logs;
CREATE POLICY analyse_logs_insert_own ON public.analyse_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.analyse_logs FROM PUBLIC, anon, authenticated;
GRANT INSERT (user_id, source, platform, app_version, check_count, payload)
  ON public.analyse_logs TO authenticated;

-- ── Admin read ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.console_analyse_logs(
  p_limit integer DEFAULT 50,
  p_email text DEFAULT NULL,
  p_only_checks boolean DEFAULT false
)
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  email text,
  source text,
  platform text,
  app_version text,
  check_count integer,
  payload jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.console_is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.created_at, lower(u.email)::text, l.source, l.platform,
    l.app_version, l.check_count, l.payload
  FROM public.analyse_logs l
  LEFT JOIN auth.users u ON u.id = l.user_id
  WHERE (p_email IS NULL OR p_email = '' OR lower(u.email) = lower(trim(p_email)))
    AND (NOT p_only_checks OR l.check_count > 0)
  ORDER BY l.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
END;
$$;

REVOKE ALL ON FUNCTION private.console_analyse_logs(integer, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.console_analyse_logs(integer, text, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_console_analyse_logs(
  p_limit integer DEFAULT 50,
  p_email text DEFAULT NULL,
  p_only_checks boolean DEFAULT false
)
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  email text,
  source text,
  platform text,
  app_version text,
  check_count integer,
  payload jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.console_analyse_logs(p_limit, p_email, p_only_checks);
$$;

REVOKE ALL ON FUNCTION public.admin_console_analyse_logs(integer, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_console_analyse_logs(integer, text, boolean) TO authenticated, service_role;
