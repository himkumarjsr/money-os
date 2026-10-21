-- Closes gaps found in an RLS review of finkoin-dev (Oct 2026).
--
-- 1. Split membership: a signed-in user could insert themselves as an active
--    member of any group whose id they knew, and a removed member could set
--    their own row back to active. Joining by invite code now goes through
--    split_join_by_code(), which checks the code. Members may only edit their
--    own row to leave; admins and the creator keep full control.
-- 2. Split settlements: either party could edit any column, including the
--    amount. No client updates settlements (the web API uses the service
--    role), so the UPDATE policy now matches no rows. New settlements must belong to
--    a group the payer is an active member of.
-- 3. users: the client could change every column except subscription_tier,
--    is_admin and fk_balance. Split access is keyed on users.email, so a user
--    who rewrote their email could read another person's groups. Clients may
--    now change only name, phone, avatar_url and the data-consent fields.
--    The trigger now keys on current_user rather than the JWT role, so
--    SECURITY DEFINER functions (award_fk) can still update fk_balance when
--    a signed-in request triggers them.
-- 4. user_stats: counters were writable by their owner. Only server-side
--    code writes them, so clients keep SELECT only.

-- 1. Split membership -------------------------------------------------------

ALTER POLICY split_members_insert ON public.split_group_members
  WITH CHECK (
    -- The creator adds themselves when creating a group.
    (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.split_groups g
        WHERE g.id = split_group_members.group_id
          AND g.created_by = (SELECT auth.uid())
      )
    )
    OR private.split_is_group_admin(group_id)
  );

ALTER POLICY split_members_update ON public.split_group_members
  USING (
    user_id = (SELECT auth.uid())
    OR private.split_is_group_admin(group_id)
  )
  WITH CHECK (
    -- A member may only leave; rejoining needs the invite code.
    (
      user_id = (SELECT auth.uid())
      AND role = 'member'
      AND status = 'left'
    )
    OR private.split_is_group_admin(group_id)
    OR EXISTS (
      SELECT 1 FROM public.split_groups g
      WHERE g.id = split_group_members.group_id
        AND g.created_by = (SELECT auth.uid())
    )
  );

-- Joins the caller to the active group with this invite code. Keeps an
-- existing admin's role; reactivates a member who had left.
CREATE OR REPLACE FUNCTION public.split_join_by_code(p_code text)
RETURNS TABLE (group_id uuid, group_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_group public.split_groups%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to join a group' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_group
  FROM public.split_groups g
  WHERE g.invite_code = upper(trim(coalesce(p_code, '')))
    AND coalesce(g.is_active, true)
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found for this invite code' USING ERRCODE = 'P0002';
  END IF;

  SELECT lower(u.email), u.name INTO v_email, v_name
  FROM public.users u WHERE u.id = v_uid;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No email on this account' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.split_group_members AS m
    (group_id, user_id, email, display_name, role, status, joined_at, left_at)
  VALUES (
    v_group.id, v_uid, v_email,
    coalesce(nullif(trim(v_name), ''), split_part(v_email, '@', 1), 'Member'),
    'member', 'active', now(), NULL
  )
  ON CONFLICT (group_id, email) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        status = 'active',
        joined_at = CASE WHEN m.status = 'active' THEN m.joined_at ELSE now() END,
        left_at = NULL;

  group_id := v_group.id;
  group_name := v_group.name;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.split_join_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.split_join_by_code(text) TO authenticated;

-- 2. Split settlements ------------------------------------------------------

ALTER POLICY split_settlements_update ON public.split_settlements
  USING (false) WITH CHECK (false);

ALTER POLICY split_settlements_insert ON public.split_settlements
  WITH CHECK (
    from_user_id = (SELECT auth.uid())
    AND private.split_is_active_member(group_id)
  );

-- 3. users: clients may change only their own profile fields ----------------

CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  -- Columns a signed-in user may edit on their own row.
  editable text[] := ARRAY[
    'name', 'phone', 'avatar_url', 'updated_at',
    'data_consent_given', 'data_consent_at', 'data_consent_version'
  ];
BEGIN
  -- current_user, not the JWT role: SECURITY DEFINER functions such as
  -- award_fk run as their owner even inside a signed-in request, and must
  -- still be able to update fk_balance.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.subscription_tier, 'free') <> 'free'
       OR coalesce((to_jsonb(NEW) ->> 'is_admin')::boolean, false)
       OR coalesce((to_jsonb(NEW) ->> 'fk_balance')::integer, 0) > 50
       OR lower(coalesce(NEW.email, '')) IS DISTINCT FROM lower(coalesce(auth.jwt() ->> 'email', '')) THEN
      RAISE EXCEPTION 'Only profile fields can be set from the app'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - editable) IS DISTINCT FROM (to_jsonb(OLD) - editable) THEN
    RAISE EXCEPTION 'Only name, phone, photo and consent can be changed from the app'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. user_stats: read-only for clients --------------------------------------

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_stats FROM anon, authenticated;
