-- Link My Policies to the Analyse form: policies entered in Analyse (term,
-- health, car, bike, other) are imported into user_policies with the fields
-- Analyse knows; the user fills in the rest (insurer, renewal date, ...).
--
-- * analyse_source_key: which Analyse entry a row came from ("term", "health",
--   "other:<row id>", ...). Unique per user so an entry is imported once.
-- * renewal_date becomes nullable: Analyse only sometimes has a renewal date,
--   and an imported policy without one shows "Add renewal date" instead of a
--   made-up date.
-- * user_policy_import_dismissals: an imported policy the user deleted is not
--   imported again.
--
-- The app keeps working before this runs: the import is skipped when the
-- column is missing.

ALTER TABLE public.user_policies
  ADD COLUMN IF NOT EXISTS analyse_source_key text;

ALTER TABLE public.user_policies
  ALTER COLUMN renewal_date DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_policies_user_analyse_source_key_idx
  ON public.user_policies (user_id, analyse_source_key);

CREATE TABLE IF NOT EXISTS public.user_policy_import_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  analyse_source_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, analyse_source_key)
);

ALTER TABLE public.user_policy_import_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own policy import dismissals"
  ON public.user_policy_import_dismissals;
CREATE POLICY "Users can read own policy import dismissals"
  ON public.user_policy_import_dismissals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own policy import dismissals"
  ON public.user_policy_import_dismissals;
CREATE POLICY "Users can insert own policy import dismissals"
  ON public.user_policy_import_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own policy import dismissals"
  ON public.user_policy_import_dismissals;
CREATE POLICY "Users can delete own policy import dismissals"
  ON public.user_policy_import_dismissals FOR DELETE
  USING (auth.uid() = user_id);
