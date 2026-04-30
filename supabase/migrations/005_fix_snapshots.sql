-- Fix user_analyse_snapshots table
CREATE TABLE IF NOT EXISTS
  public.user_analyse_snapshots (
  user_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
    NOT NULL
);

ALTER TABLE public.user_analyse_snapshots
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshots_own"
  ON public.user_analyse_snapshots;

CREATE POLICY "snapshots_own"
  ON public.user_analyse_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix user_analysis table too
CREATE TABLE IF NOT EXISTS
  public.user_analysis (
  id uuid DEFAULT gen_random_uuid()
    PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users(id)
    ON DELETE CASCADE,
  profile_hash text,
  profile jsonb DEFAULT '{}',
  analysis_result jsonb DEFAULT '{}',
  ai_fix_plan jsonb DEFAULT '{}',
  projection jsonb DEFAULT '{}',
  ai_generated_at timestamptz,
  last_step_completed integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_analysis
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analysis_own"
  ON public.user_analysis;

CREATE POLICY "analysis_own"
  ON public.user_analysis
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
