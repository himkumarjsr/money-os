-- Stop users from granting themselves Pro or admin.
--
-- public.users is writable by its owner (RLS "users_own" / app profile edits),
-- which also let a signed-in user set subscription_tier = 'pro' or
-- is_admin = true from the browser with the anon key. This trigger leaves
-- every other column editable and only lets the service role (server routes
-- such as /api/razorpay/verify-payment) or the database owner change these.
--
-- Works whatever RLS policies are live, and whether or not is_admin exists.

CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  caller text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
BEGIN
  -- Only API callers using the anon / authenticated roles are restricted.
  IF caller IS NULL OR caller NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.subscription_tier, 'free') <> 'free'
       OR coalesce((to_jsonb(NEW) ->> 'is_admin')::boolean, false) THEN
      RAISE EXCEPTION 'subscription_tier and is_admin can only be set by the server'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR (to_jsonb(NEW) -> 'is_admin') IS DISTINCT FROM (to_jsonb(OLD) -> 'is_admin') THEN
    RAISE EXCEPTION 'subscription_tier and is_admin can only be changed by the server'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_user_columns ON public.users;
CREATE TRIGGER protect_privileged_user_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_user_columns();

-- One row per Razorpay payment: proof of purchase for GST / refunds, and a
-- payment can only ever upgrade the account that created its order.
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kept (set null) when the account is deleted: tax records outlive accounts.
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  razorpay_order_id text NOT NULL,
  razorpay_payment_id text NOT NULL UNIQUE,
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'captured',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can see their own payments; only the server writes them.
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);
