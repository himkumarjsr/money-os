-- Plan checklist (/admin/plan-checklist): tick boxes for the market-leader
-- plan. Every console admin (migration 053) can see the ticks; only a super
-- admin can change them. The item list lives in the app
-- (lib/adminDocs/planChecklist.ts); this table only stores which ids are
-- done, so unticking deletes the row.
--
-- Super admins are listed in their own table so the role can't be granted
-- from the console: the admin-access page only manages console_admins.
-- Add another super admin here with SQL if you ever need one.
--
-- Both tables live in the private schema (not exposed over REST) with RLS on
-- and no grants, so the apps reach them only through the invoker wrappers at
-- the end, and every owner-rights function checks the caller first.

CREATE TABLE IF NOT EXISTS private.console_super_admins (
  email text PRIMARY KEY
    CHECK (email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.console_super_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.console_super_admins FROM PUBLIC, anon, authenticated;

INSERT INTO private.console_super_admins (email)
VALUES ('himkumarjsr@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.plan_checklist_ticks (
  item_id text PRIMARY KEY CHECK (item_id ~ '^[a-z0-9-]{1,64}$'),
  done_by text NOT NULL,
  done_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.plan_checklist_ticks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.plan_checklist_ticks FROM PUBLIC, anon, authenticated;

-- ── Caller check ────────────────────────────────────────────────────────

-- A super admin must also still be a console admin.
CREATE OR REPLACE FUNCTION private.console_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.console_is_admin() AND EXISTS (
    SELECT 1 FROM private.console_super_admins s
    WHERE s.email = private.console_caller_email()
  );
$$;

-- ── Admin read, super admin write ───────────────────────────────────────

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
  IF NOT private.console_is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT t.item_id, t.done_by, t.done_at
  FROM private.plan_checklist_ticks t
  ORDER BY t.done_at;
END;
$$;

CREATE OR REPLACE FUNCTION private.console_set_plan_tick(
  p_item_id text,
  p_done boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id text := lower(btrim(coalesce(p_item_id, '')));
BEGIN
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Super admin only' USING ERRCODE = '42501';
  END IF;
  IF v_id !~ '^[a-z0-9-]{1,64}$' THEN
    RAISE EXCEPTION 'Invalid item id' USING ERRCODE = '22023';
  END IF;

  IF coalesce(p_done, false) THEN
    INSERT INTO private.plan_checklist_ticks (item_id, done_by)
    VALUES (v_id, private.console_caller_email())
    ON CONFLICT (item_id) DO NOTHING;
  ELSE
    DELETE FROM private.plan_checklist_ticks WHERE item_id = v_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.console_is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_plan_ticks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.console_set_plan_tick(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.console_is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_plan_ticks() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.console_set_plan_tick(text, boolean) TO authenticated, service_role;

-- ── Public API: invoker wrappers (as in 053) ────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_console_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.admin_console_plan_ticks()
RETURNS TABLE (
  item_id text,
  done_by text,
  done_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.console_plan_ticks();
$$;

CREATE OR REPLACE FUNCTION public.admin_console_set_plan_tick(
  p_item_id text,
  p_done boolean
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_set_plan_tick(p_item_id, p_done);
$$;

REVOKE ALL ON FUNCTION public.admin_console_is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_plan_ticks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_console_set_plan_tick(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_console_is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_plan_ticks() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_console_set_plan_tick(text, boolean) TO authenticated, service_role;
