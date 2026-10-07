-- Planned investments: reminder + Tracker line items the user consented to from the Fix Plan.
-- Reveals intended future financial moves — same sensitivity as balances. Owner-only RLS,
-- no analytics export without explicit anonymization. Nothing here ever executes a trade
-- or debit; rows are reminders the user marks started themselves.

CREATE TABLE IF NOT EXISTS public.user_planned_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Where it came from: a funded goal (goalId, e.g. "kid_education:0") or a priority item id.
  source_kind text NOT NULL CHECK (source_kind IN ('goal', 'priority')),
  source_id text NOT NULL CHECK (char_length(source_id) BETWEEN 1 AND 80),
  source_label text NOT NULL CHECK (char_length(source_label) BETWEEN 1 AND 120),
  instrument_key text NOT NULL CHECK (char_length(instrument_key) BETWEEN 1 AND 40),
  instrument_label text NOT NULL CHECK (char_length(instrument_label) BETWEEN 1 AND 120),
  monthly_amount integer NOT NULL CHECK (monthly_amount > 0 AND monthly_amount <= 10000000),
  start_month date NOT NULL CHECK (EXTRACT(DAY FROM start_month) = 1),
  consent_given_at timestamptz NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'done')),
  started_at timestamptz,
  -- Set by the reminder cron so a row is only reminded once.
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id, instrument_key)
);

CREATE INDEX IF NOT EXISTS user_planned_investments_user_idx
  ON public.user_planned_investments (user_id);

CREATE INDEX IF NOT EXISTS user_planned_investments_reminder_idx
  ON public.user_planned_investments (start_month)
  WHERE status = 'pending' AND reminded_at IS NULL;

ALTER TABLE public.user_planned_investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_planned_investments_own" ON public.user_planned_investments;
CREATE POLICY "user_planned_investments_own"
  ON public.user_planned_investments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
