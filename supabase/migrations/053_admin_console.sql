-- Admin console (/admin, web only): who may open it and who may grant it.
--
-- Access is by verified email, so an admin can invite someone before they
-- have a Finkoin account; it takes effect the first time they sign in with
-- that email. Only an existing admin can add or remove admins, and nobody
-- can remove themselves, so there is always at least one admin left.
--
-- This is separate from public.users.is_admin, which only skips the Pro
-- paywall: granting console access does not give anyone free Pro.
--
-- The list lives in the private schema (not exposed over REST). The apps
-- reach it only through the four invoker wrappers at the end, and every
-- owner-rights function checks the caller first.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.console_admins (
  email text PRIMARY KEY
    CHECK (email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Email of the admin who granted access ('seed' for the first admin).
  invited_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.console_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.console_admins FROM PUBLIC, anon, authenticated;

INSERT INTO private.console_admins (email, invited_by)
VALUES ('himkumarjsr@gmail.com', 'seed')
ON CONFLICT (email) DO NOTHING;

-- ── Caller checks ───────────────────────────────────────────────────────

-- The caller's email, only once Supabase has confirmed they own it.
CREATE OR REPLACE FUNCTION private.console_caller_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = (SELECT auth.uid())
    AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.console_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.console_admins a
    WHERE a.email = private.console_caller_email()
  );
$$;

-- ── Admin-only actions ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.console_list_admins()
RETURNS TABLE (
  email text,
  invited_by text,
  created_at timestamptz,
  has_account boolean
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
  SELECT a.email,
    a.invited_by,
    a.created_at,
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE lower(u.email) = a.email AND u.email_confirmed_at IS NOT NULL
    )
  FROM private.console_admins a
  ORDER BY a.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION private.console_grant_admin(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF NOT private.console_is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.console_admins (email, invited_by)
  VALUES (v_email, private.console_caller_email())
  ON CONFLICT (email) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION private.console_revoke_admin(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF NOT private.console_is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  -- Keeps at least one admin: the caller is one and can't remove themselves.
  IF v_email = private.console_caller_email() THEN
    RAISE EXCEPTION 'You cannot remove your own admin access' USING ERRCODE = '22023';
  END IF;

  DELETE FROM private.console_admins WHERE email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION private.console_caller_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_list_admins() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_grant_admin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_revoke_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.console_caller_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_list_admins() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_grant_admin(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_revoke_admin(text) TO authenticated, service_role;

-- ── Public API: invoker wrappers (as in 048 / 051) ──────────────────────

CREATE OR REPLACE FUNCTION public.admin_console_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_is_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_console_list()
RETURNS TABLE (
  email text,
  invited_by text,
  created_at timestamptz,
  has_account boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.console_list_admins();
$$;

CREATE OR REPLACE FUNCTION public.admin_console_grant(p_email text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_grant_admin(p_email);
$$;

CREATE OR REPLACE FUNCTION public.admin_console_revoke(p_email text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_revoke_admin(p_email);
$$;

REVOKE ALL ON FUNCTION public.admin_console_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_grant(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_revoke(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_console_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_list() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_grant(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_revoke(text) TO authenticated, service_role;
