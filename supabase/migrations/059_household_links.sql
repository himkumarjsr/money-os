-- Household links: two Finkoin accounts (usually a couple) join as one
-- household. One partner creates an invite code, the other accepts it.
-- Each partner chooses what the other can see: their analyse profile (for
-- the combined household report) and/or their tracker spends. Nothing is
-- shared until it is switched on, and either partner can unlink any time.
--
-- Tables are not readable directly; every read and write goes through the
-- household_* functions below, which only ever return the caller's own link
-- and what their partner chose to share.

CREATE TABLE IF NOT EXISTS public.household_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{8}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CHECK (partner_id IS NULL OR partner_id <> inviter_id),
  CHECK ((status = 'active') = (partner_id IS NOT NULL))
);

-- One link per person, whichever side they are on.
CREATE UNIQUE INDEX IF NOT EXISTS household_links_inviter_uidx
  ON public.household_links (inviter_id);
CREATE UNIQUE INDEX IF NOT EXISTS household_links_partner_uidx
  ON public.household_links (partner_id) WHERE partner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.household_share (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  share_profile boolean NOT NULL DEFAULT false,
  share_tracker boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.household_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_share ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.household_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.household_share FROM PUBLIC, anon, authenticated;

-- ── Helpers ─────────────────────────────────────────────────────────────

-- The caller's partner on an active link, or NULL.
CREATE OR REPLACE FUNCTION private.household_partner_of(p_user uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN l.inviter_id = p_user THEN l.partner_id ELSE l.inviter_id END
  FROM public.household_links l
  WHERE l.status = 'active' AND (l.inviter_id = p_user OR l.partner_id = p_user)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.household_partner_of(uuid) FROM PUBLIC, anon, authenticated;

-- ── Status ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.household_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_link public.household_links;
  v_partner uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_link FROM public.household_links
  WHERE inviter_id = v_me OR partner_id = v_me
  LIMIT 1;
  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('status', 'none');
  END IF;
  v_partner := CASE WHEN v_link.inviter_id = v_me THEN v_link.partner_id ELSE v_link.inviter_id END;
  RETURN jsonb_build_object(
    'status', v_link.status,
    'invite_code', CASE WHEN v_link.status = 'pending' THEN v_link.invite_code END,
    'linked_at', v_link.accepted_at,
    'partner_name', (SELECT coalesce(u.name, 'Your partner') FROM public.users u WHERE u.id = v_partner),
    'my_share', (
      SELECT jsonb_build_object('profile', coalesce(s.share_profile, false), 'tracker', coalesce(s.share_tracker, false))
      FROM (SELECT 1) one LEFT JOIN public.household_share s ON s.user_id = v_me
    ),
    'partner_share', CASE WHEN v_partner IS NULL THEN NULL ELSE (
      SELECT jsonb_build_object('profile', coalesce(s.share_profile, false), 'tracker', coalesce(s.share_tracker, false))
      FROM (SELECT 1) one LEFT JOIN public.household_share s ON s.user_id = v_partner
    ) END
  );
END;
$$;

-- ── Invite, accept, unlink ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.household_create_invite()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_code text;
  v_existing public.household_links;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_existing FROM public.household_links
  WHERE inviter_id = v_me OR partner_id = v_me
  LIMIT 1;
  IF v_existing.status = 'active' THEN
    RAISE EXCEPTION 'You are already linked. Unlink first.' USING ERRCODE = 'P0001';
  END IF;
  IF v_existing.status = 'pending' THEN
    RETURN v_existing.invite_code;
  END IF;
  LOOP
    -- 8 characters from A-Z and 2-9 (no 0/1/O/I to avoid typos).
    SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    INTO v_code FROM generate_series(1, 8);
    BEGIN
      INSERT INTO public.household_links (inviter_id, invite_code) VALUES (v_me, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- Code clash: try another.
      NULL;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.household_accept_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_link public.household_links;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_link FROM public.household_links
  WHERE invite_code = upper(trim(p_code)) AND status = 'pending'
  FOR UPDATE;
  IF v_link.id IS NULL THEN
    RAISE EXCEPTION 'This invite code is not valid or was already used.' USING ERRCODE = 'P0001';
  END IF;
  IF v_link.inviter_id = v_me THEN
    RAISE EXCEPTION 'This is your own invite. Send it to your partner.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.household_links
    WHERE status = 'active' AND (inviter_id = v_me OR partner_id = v_me)
  ) THEN
    RAISE EXCEPTION 'You are already linked. Unlink first.' USING ERRCODE = 'P0001';
  END IF;
  -- Accepting drops the caller's own unused invite.
  DELETE FROM public.household_links WHERE inviter_id = v_me AND status = 'pending';
  UPDATE public.household_links
  SET partner_id = v_me, status = 'active', accepted_at = now()
  WHERE id = v_link.id;
  RETURN private.household_status();
END;
$$;

CREATE OR REPLACE FUNCTION private.household_unlink()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  -- Sharing switches off for both, so a later partner starts from nothing.
  UPDATE public.household_share
  SET share_profile = false, share_tracker = false, updated_at = now()
  WHERE user_id IN (v_me, private.household_partner_of(v_me));
  DELETE FROM public.household_links WHERE inviter_id = v_me OR partner_id = v_me;
END;
$$;

CREATE OR REPLACE FUNCTION private.household_set_share(p_profile boolean, p_tracker boolean)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.household_share (user_id, share_profile, share_tracker, updated_at)
  VALUES (v_me, coalesce(p_profile, false), coalesce(p_tracker, false), now())
  ON CONFLICT (user_id) DO UPDATE
  SET share_profile = excluded.share_profile,
      share_tracker = excluded.share_tracker,
      updated_at = now();
  RETURN private.household_status();
END;
$$;

-- ── Partner data (only what they chose to share) ────────────────────────

CREATE OR REPLACE FUNCTION private.household_partner_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_partner uuid := private.household_partner_of(auth.uid());
BEGIN
  IF v_partner IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.household_share s
    WHERE s.user_id = v_partner AND s.share_profile
  ) THEN
    RETURN NULL;
  END IF;
  -- The saved report's profile, else the last form submission.
  RETURN coalesce(
    (SELECT nullif(a.profile, '{}'::jsonb) FROM public.user_analysis a WHERE a.user_id = v_partner),
    (SELECT coalesce(s.payload -> 'profile', s.payload -> 'lastSubmission')
     FROM public.user_analyse_snapshots s WHERE s.user_id = v_partner)
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.household_partner_transactions(p_from date, p_to date)
RETURNS TABLE (
  id uuid,
  date date,
  amount numeric,
  category text,
  subcategory text,
  description text,
  bucket text,
  payment_method text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_partner uuid := private.household_partner_of(auth.uid());
BEGIN
  IF v_partner IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.household_share s
    WHERE s.user_id = v_partner AND s.share_tracker
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT t.id, t.date, t.amount, t.category, t.subcategory, t.description,
    t.bucket, t.payment_method
  FROM public.expense_transactions t
  WHERE t.user_id = v_partner
    AND t.date BETWEEN p_from AND p_to
    -- At most a year at a time.
    AND p_to - p_from <= 366
  ORDER BY t.date DESC, t.created_at DESC
  LIMIT 1000;
END;
$$;

REVOKE ALL ON FUNCTION private.household_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_create_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_accept_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_unlink() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_set_share(boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_partner_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.household_partner_transactions(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.household_status() TO authenticated;
GRANT EXECUTE ON FUNCTION private.household_create_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION private.household_accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.household_unlink() TO authenticated;
GRANT EXECUTE ON FUNCTION private.household_set_share(boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.household_partner_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION private.household_partner_transactions(date, date) TO authenticated;

-- ── Public wrappers (called with supabase.rpc) ──────────────────────────

CREATE OR REPLACE FUNCTION public.household_status()
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.household_status(); $$;

CREATE OR REPLACE FUNCTION public.household_create_invite()
RETURNS text LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.household_create_invite(); $$;

CREATE OR REPLACE FUNCTION public.household_accept_invite(p_code text)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.household_accept_invite(p_code); $$;

CREATE OR REPLACE FUNCTION public.household_unlink()
RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.household_unlink(); $$;

CREATE OR REPLACE FUNCTION public.household_set_share(p_profile boolean, p_tracker boolean)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.household_set_share(p_profile, p_tracker); $$;

CREATE OR REPLACE FUNCTION public.household_partner_profile()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.household_partner_profile(); $$;

CREATE OR REPLACE FUNCTION public.household_partner_transactions(p_from date, p_to date)
RETURNS TABLE (
  id uuid, date date, amount numeric, category text, subcategory text,
  description text, bucket text, payment_method text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.household_partner_transactions(p_from, p_to); $$;

REVOKE ALL ON FUNCTION public.household_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_create_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_accept_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_unlink() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_set_share(boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_partner_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.household_partner_transactions(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.household_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_create_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_unlink() TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_set_share(boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_partner_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_partner_transactions(date, date) TO authenticated;
