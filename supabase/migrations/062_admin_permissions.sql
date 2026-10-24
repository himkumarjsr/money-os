-- Admin permissions: the super admin (migration 060) decides, per console
-- admin, which admin console sections they can open and which app features
-- they get for free, and can take any of it back later.
--
-- Permission keys:
--   section:*        every admin console section (not Admin access)
--   section:<id>     one section, e.g. section:analyse-logs
--   fixplan_free     open /analyse/fixplan without paying
--   pro_free         every Pro feature (Fix Plan, Money Map) without paying;
--                    it also passes any fixplan_free check
--
-- The super admin always has every key. Only the super admin can add or
-- remove admins or change permissions; until now any admin could invite
-- others. Removing an admin removes their permissions too.
--
-- Admins who existed before this migration keep what they had: they get
-- section:* so nothing changes until the super admin narrows it. New admins
-- start with nothing ticked.
--
-- Same layout as 053/060: tables in the private schema with RLS on and no
-- grants, owner-rights functions that check the caller first, and invoker
-- wrappers in public.

CREATE TABLE IF NOT EXISTS private.console_permissions (
  email text NOT NULL
    REFERENCES private.console_admins (email) ON DELETE CASCADE,
  perm text NOT NULL
    CHECK (perm ~ '^(section:(\*|[a-z0-9-]{1,64})|fixplan_free|pro_free)$'),
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, perm)
);

ALTER TABLE private.console_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.console_permissions FROM PUBLIC, anon, authenticated;

INSERT INTO private.console_permissions (email, perm, granted_by)
SELECT a.email, 'section:*', 'migration-062'
FROM private.console_admins a
WHERE NOT EXISTS (
  SELECT 1 FROM private.console_super_admins s WHERE s.email = a.email
)
ON CONFLICT DO NOTHING;

-- ── Checks ──────────────────────────────────────────────────────────────

-- Whether an email holds a key. A super admin holds every key; a section
-- key is also met by section:*. Admin access itself is super admin only.
CREATE OR REPLACE FUNCTION private.console_email_has_permission(
  p_email text,
  p_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH e AS (SELECT lower(btrim(coalesce(p_email, ''))) AS email)
  SELECT EXISTS (SELECT 1 FROM private.console_admins a, e WHERE a.email = e.email)
    AND (
      EXISTS (SELECT 1 FROM private.console_super_admins s, e WHERE s.email = e.email)
      OR (
        coalesce(p_key, '') <> 'section:admin-access'
        AND EXISTS (
          SELECT 1 FROM private.console_permissions p, e
          WHERE p.email = e.email
            AND (
              p.perm = p_key
              OR (p.perm = 'section:*' AND p_key LIKE 'section:%')
              OR (p.perm = 'pro_free' AND p_key = 'fixplan_free')
            )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.console_has_permission(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    private.console_email_has_permission(private.console_caller_email(), p_key),
    false
  );
$$;

-- The caller's own keys ('*' for the super admin), for the apps to show or
-- hide things. The checks that matter run in the database or on the server.
CREATE OR REPLACE FUNCTION private.console_my_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN private.console_is_super_admin() THEN ARRAY['*']
    WHEN NOT private.console_is_admin() THEN ARRAY[]::text[]
    ELSE coalesce(
      (SELECT array_agg(p.perm ORDER BY p.perm)
       FROM private.console_permissions p
       WHERE p.email = private.console_caller_email()),
      ARRAY[]::text[]
    )
  END;
$$;

-- ── Super admin: manage admins and their permissions ────────────────────

CREATE OR REPLACE FUNCTION private.console_list_access()
RETURNS TABLE (
  email text,
  invited_by text,
  created_at timestamptz,
  has_account boolean,
  is_super boolean,
  perms text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT a.email,
    a.invited_by,
    a.created_at,
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE lower(u.email) = a.email AND u.email_confirmed_at IS NOT NULL
    ),
    EXISTS (SELECT 1 FROM private.console_super_admins s WHERE s.email = a.email),
    coalesce(
      (SELECT array_agg(p.perm ORDER BY p.perm)
       FROM private.console_permissions p WHERE p.email = a.email),
      ARRAY[]::text[]
    )
  FROM private.console_admins a
  ORDER BY a.created_at;
END;
$$;

-- Replaces the admin's keys with p_perms (all or nothing).
CREATE OR REPLACE FUNCTION private.console_set_permissions(
  p_email text,
  p_perms text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_perms text[] := coalesce(p_perms, ARRAY[]::text[]);
BEGIN
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.console_admins a WHERE a.email = v_email) THEN
    RAISE EXCEPTION 'Add them as an admin first' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM private.console_super_admins s WHERE s.email = v_email) THEN
    RAISE EXCEPTION 'The super admin always has every permission' USING ERRCODE = '22023';
  END IF;
  IF array_length(v_perms, 1) > 100 OR EXISTS (
    SELECT 1 FROM unnest(v_perms) k
    WHERE k IS NULL
      OR k !~ '^(section:(\*|[a-z0-9-]{1,64})|fixplan_free|pro_free)$'
      OR k = 'section:admin-access'
  ) THEN
    RAISE EXCEPTION 'Unknown permission' USING ERRCODE = '22023';
  END IF;

  DELETE FROM private.console_permissions p
  WHERE p.email = v_email AND NOT (p.perm = ANY (v_perms));

  INSERT INTO private.console_permissions (email, perm, granted_by)
  SELECT v_email, k, private.console_caller_email()
  FROM (SELECT DISTINCT unnest(v_perms) AS k) x
  ON CONFLICT DO NOTHING;
END;
$$;

-- Admin invites and removals become super admin only.
CREATE OR REPLACE FUNCTION private.console_grant_admin(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
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
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
  END IF;
  IF v_email = private.console_caller_email()
     OR EXISTS (SELECT 1 FROM private.console_super_admins s WHERE s.email = v_email) THEN
    RAISE EXCEPTION 'You cannot remove a super admin' USING ERRCODE = '22023';
  END IF;

  -- Permissions go with it (ON DELETE CASCADE).
  DELETE FROM private.console_admins WHERE email = v_email;
END;
$$;

-- The old list (053) is now super admin only as well.
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
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.email, l.invited_by, l.created_at, l.has_account
  FROM private.console_list_access() l;
END;
$$;

-- ── Section checks on existing console data ─────────────────────────────

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
  IF NOT private.console_has_permission('section:analyse-logs') THEN
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

CREATE OR REPLACE FUNCTION private.console_plan_ticks()
RETURNS TABLE (
  item_id text,
  done_by text,
  done_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.console_has_permission('section:plan-checklist') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT t.item_id, t.done_by, t.done_at
  FROM private.plan_checklist_ticks t
  ORDER BY t.done_at;
END;
$$;

REVOKE ALL ON FUNCTION private.console_email_has_permission(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.console_has_permission(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_my_permissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_list_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_set_permissions(text, text[]) FROM PUBLIC, anon;
-- Any email can be checked, so only the server (service role) may call it.
GRANT EXECUTE ON FUNCTION private.console_email_has_permission(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.console_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_my_permissions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_list_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_set_permissions(text, text[]) TO authenticated, service_role;

-- ── Public API: invoker wrappers (as in 053) ────────────────────────────

-- Shared with migration 061 (fix plan purchases): fix_plan_access() calls
-- admin_has_permission('fixplan_free') when this function exists.
CREATE OR REPLACE FUNCTION public.admin_has_permission(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_has_permission(p_key);
$$;

CREATE OR REPLACE FUNCTION public.admin_console_my_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_my_permissions();
$$;

CREATE OR REPLACE FUNCTION public.admin_console_list_access()
RETURNS TABLE (
  email text,
  invited_by text,
  created_at timestamptz,
  has_account boolean,
  is_super boolean,
  perms text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.console_list_access();
$$;

CREATE OR REPLACE FUNCTION public.admin_console_set_permissions(
  p_email text,
  p_perms text[]
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_set_permissions(p_email, p_perms);
$$;

REVOKE ALL ON FUNCTION public.admin_has_permission(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_my_permissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_list_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_set_permissions(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_my_permissions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_list_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_set_permissions(text, text[]) TO authenticated, service_role;
