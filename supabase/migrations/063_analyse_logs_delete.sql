-- Analyse logs: let the super admin (migration 060) permanently delete rows
-- from the admin console, one at a time or several at once, so old reports
-- that are no longer needed don't pile up in the database.
--
-- Only the analyse_logs rows go. The users' own data (profile, plans,
-- trackers) is never touched, and users still can't read, edit or delete
-- their rows themselves. Other console admins can keep reading logs with
-- section:analyse-logs (migration 062) but cannot delete them.
--
-- Same layout as 053/062: the check and the delete run in a SECURITY
-- DEFINER function in the private schema, and the public function is a thin
-- SECURITY INVOKER wrapper for the API.

CREATE OR REPLACE FUNCTION private.console_delete_analyse_logs(p_ids bigint[])
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT private.console_is_super_admin() THEN
    RAISE EXCEPTION 'Only the super admin can delete logs' USING ERRCODE = '42501';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RETURN 0;
  END IF;
  IF cardinality(p_ids) > 200 THEN
    RAISE EXCEPTION 'At most 200 logs at a time' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.analyse_logs l WHERE l.id = ANY (p_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION private.console_delete_analyse_logs(bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.console_delete_analyse_logs(bigint[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_console_delete_analyse_logs(p_ids bigint[])
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.console_delete_analyse_logs(p_ids);
$$;

REVOKE ALL ON FUNCTION public.admin_console_delete_analyse_logs(bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_console_delete_analyse_logs(bigint[]) TO authenticated, service_role;
