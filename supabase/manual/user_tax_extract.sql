-- Manual: encrypted tax extract numbers (ITR Phase 1).
CREATE TABLE IF NOT EXISTS public.user_tax_extract (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  encrypted_data text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  encryption_version integer NOT NULL DEFAULT 1,
  data_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_tax_extract ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tax_extract_own" ON public.user_tax_extract;
CREATE POLICY "user_tax_extract_own"
  ON public.user_tax_extract
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
