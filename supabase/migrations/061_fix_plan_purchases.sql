-- Fix Plan (/analyse/fixplan) sold as a ₹199 one-year pass through Google
-- Play Billing and Apple In-App Purchase, inside the mobile app only.
--
-- The server (/api/billing/store-purchase) checks each purchase with Google
-- or Apple first and only then records it here with the service role. A
-- purchase unlocks the same account everywhere, so a user who buys in the
-- app also gets the page on finkoin.com once signed in with that account.
--
-- Who may open the Fix Plan (public.fix_plan_access):
--   1. an unexpired store purchase (one year from purchase; buying again
--      while still active adds a year on top),
--   2. Pro / Pro Max (users.subscription_tier), or users.is_admin, as before,
--   3. a console admin the super admin gave the 'fixplan_free' permission
--      (migration 062, admin_has_permission). Checked only when 062 is
--      installed, so this file works whichever runs first.
--
-- Purchases live in the private schema (not exposed over REST) with RLS on
-- and no grants. Users read only their own status through the wrapper.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.fix_plan_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kept (set null) when the account is deleted: tax records outlive accounts.
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  product_id text NOT NULL,
  -- Google order id (GPA.…) or Apple transaction id. One row per payment,
  -- so replaying the same receipt never adds another year.
  store_transaction_id text NOT NULL,
  purchase_token text,
  environment text NOT NULL DEFAULT 'production',
  purchased_at timestamptz NOT NULL,
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  -- Set when the store reports a refund; the pass stops working.
  revoked_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, store_transaction_id)
);

CREATE INDEX IF NOT EXISTS fix_plan_purchases_user_idx
  ON private.fix_plan_purchases (user_id, expires_at DESC);

ALTER TABLE private.fix_plan_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.fix_plan_purchases FROM PUBLIC, anon, authenticated;

-- ── Access check ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.fix_plan_access_for(p_user uuid)
RETURNS TABLE (has_access boolean, reason text, expires_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expires timestamptz;
  v_tier text;
  v_is_admin boolean;
  v_email text;
  v_granted boolean := false;
BEGIN
  IF p_user IS NULL THEN
    RETURN QUERY SELECT false, 'signed_out'::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT max(p.expires_at) INTO v_expires
  FROM private.fix_plan_purchases p
  WHERE p.user_id = p_user AND p.revoked_at IS NULL;

  IF v_expires IS NOT NULL AND v_expires > now() THEN
    RETURN QUERY SELECT true, 'purchase'::text, v_expires;
    RETURN;
  END IF;

  SELECT lower(coalesce(u.subscription_tier, '')),
    coalesce((to_jsonb(u) ->> 'is_admin')::boolean, false)
  INTO v_tier, v_is_admin
  FROM public.users u
  WHERE u.id = p_user;

  IF v_tier IN ('pro', 'promax') THEN
    RETURN QUERY SELECT true, 'pro'::text, NULL::timestamptz;
    RETURN;
  END IF;
  IF v_is_admin THEN
    RETURN QUERY SELECT true, 'admin'::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Super-admin grant (migration 062). Looked up by name so this file does
  -- not depend on 062 being installed.
  IF to_regprocedure('private.console_email_has_permission(text,text)') IS NOT NULL THEN
    SELECT lower(au.email) INTO v_email
    FROM auth.users au
    WHERE au.id = p_user AND au.email_confirmed_at IS NOT NULL;
    IF v_email IS NOT NULL THEN
      EXECUTE 'SELECT private.console_email_has_permission($1, $2)'
        INTO v_granted
        USING v_email, 'fixplan_free';
    END IF;
  END IF;

  IF coalesce(v_granted, false) THEN
    RETURN QUERY SELECT true, 'granted'::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Expired pass: report when it ended so the app can say so.
  RETURN QUERY SELECT false,
    CASE WHEN v_expires IS NULL THEN 'none' ELSE 'expired' END,
    v_expires;
END;
$$;

-- The signed-in caller's own status (never someone else's).
CREATE OR REPLACE FUNCTION private.fix_plan_my_access()
RETURNS TABLE (has_access boolean, reason text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM private.fix_plan_access_for((SELECT auth.uid()));
$$;

-- ── Recording a verified purchase (server only) ─────────────────────────

CREATE OR REPLACE FUNCTION private.fix_plan_record_purchase(
  p_user uuid,
  p_platform text,
  p_product_id text,
  p_transaction_id text,
  p_purchase_token text,
  p_purchased_at timestamptz,
  p_environment text,
  p_raw jsonb
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing private.fix_plan_purchases%ROWTYPE;
  v_current timestamptz;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF p_user IS NULL OR coalesce(btrim(p_transaction_id), '') = '' THEN
    RAISE EXCEPTION 'Missing user or transaction' USING ERRCODE = '22023';
  END IF;

  -- Serialise purchases per user so two at once can't both start "now".
  PERFORM pg_advisory_xact_lock(hashtext('fix_plan:' || p_user::text));

  SELECT * INTO v_existing
  FROM private.fix_plan_purchases
  WHERE platform = p_platform AND store_transaction_id = p_transaction_id;

  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user THEN
      RAISE EXCEPTION 'This purchase belongs to a different account'
        USING ERRCODE = '42501';
    END IF;
    RETURN v_existing.expires_at;
  END IF;

  SELECT max(expires_at) INTO v_current
  FROM private.fix_plan_purchases
  WHERE user_id = p_user AND revoked_at IS NULL;

  v_start := greatest(coalesce(p_purchased_at, now()), coalesce(v_current, '-infinity'::timestamptz));
  v_end := v_start + interval '1 year';

  INSERT INTO private.fix_plan_purchases (
    user_id, platform, product_id, store_transaction_id, purchase_token,
    environment, purchased_at, starts_at, expires_at, raw
  ) VALUES (
    p_user, p_platform, p_product_id, p_transaction_id, p_purchase_token,
    coalesce(nullif(p_environment, ''), 'production'),
    coalesce(p_purchased_at, now()), v_start, v_end, coalesce(p_raw, '{}'::jsonb)
  );

  RETURN v_end;
END;
$$;

REVOKE ALL ON FUNCTION private.fix_plan_access_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.fix_plan_my_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.fix_plan_record_purchase(uuid, text, text, text, text, timestamptz, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fix_plan_access_for(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.fix_plan_my_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.fix_plan_record_purchase(uuid, text, text, text, text, timestamptz, text, jsonb)
  TO service_role;

-- ── Public API: invoker wrappers (as in 053 / 060) ──────────────────────

-- Apps: "may I open the Fix Plan?" for the signed-in user.
CREATE OR REPLACE FUNCTION public.fix_plan_access()
RETURNS TABLE (has_access boolean, reason text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.fix_plan_my_access();
$$;

-- Server routes (service role): any user's status, and recording purchases.
CREATE OR REPLACE FUNCTION public.fix_plan_access_for_user(p_user uuid)
RETURNS TABLE (has_access boolean, reason text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.fix_plan_access_for(p_user);
$$;

CREATE OR REPLACE FUNCTION public.fix_plan_record_purchase(
  p_user uuid,
  p_platform text,
  p_product_id text,
  p_transaction_id text,
  p_purchase_token text,
  p_purchased_at timestamptz,
  p_environment text,
  p_raw jsonb
)
RETURNS timestamptz
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.fix_plan_record_purchase(
    p_user, p_platform, p_product_id, p_transaction_id, p_purchase_token,
    p_purchased_at, p_environment, p_raw
  );
$$;

REVOKE ALL ON FUNCTION public.fix_plan_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fix_plan_access_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fix_plan_record_purchase(uuid, text, text, text, text, timestamptz, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fix_plan_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fix_plan_access_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_plan_record_purchase(uuid, text, text, text, text, timestamptz, text, jsonb)
  TO service_role;
