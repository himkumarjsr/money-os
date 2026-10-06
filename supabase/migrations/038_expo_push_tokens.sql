-- Expo push tokens for native app (iOS / Android) device notifications.
-- Web Push stays in push_subscriptions; both are sent by the same server flows.

CREATE TABLE IF NOT EXISTS public.expo_push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  device_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS expo_push_tokens_user_id_idx
  ON public.expo_push_tokens (user_id);

ALTER TABLE public.expo_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expo_push_token_own" ON public.expo_push_tokens;
CREATE POLICY "expo_push_token_own"
  ON public.expo_push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.expo_push_tokens IS
  'Native app Expo push tokens; used by deliver-tip / split notify alongside Web Push.';
