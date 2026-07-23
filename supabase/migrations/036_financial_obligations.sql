-- Financial calendar: obligations + monthly checklist
-- Already applied on production Supabase; kept in repo for new environments.

CREATE TABLE IF NOT EXISTS public.financial_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  due_day INTEGER,
  due_month INTEGER,
  due_date DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  remind_days_before INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, title, category)
);

CREATE TABLE IF NOT EXISTS public.obligation_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES public.financial_obligations (id) ON DELETE CASCADE,
  checklist_month DATE NOT NULL,
  expected_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'skipped', 'auto_debit')),
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, obligation_id, checklist_month)
);

CREATE INDEX IF NOT EXISTS financial_obligations_user_active_idx
  ON public.financial_obligations (user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS obligation_checklist_user_month_idx
  ON public.obligation_checklist (user_id, checklist_month);

ALTER TABLE public.financial_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligation_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_obligations_own ON public.financial_obligations;
CREATE POLICY financial_obligations_own ON public.financial_obligations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS obligation_checklist_own ON public.obligation_checklist;
CREATE POLICY obligation_checklist_own ON public.obligation_checklist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Generate checklist rows for active obligations for a given month (1st of month).
CREATE OR REPLACE FUNCTION public.generate_monthly_checklist(
  p_user_id UUID,
  p_month DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start DATE := date_trunc('month', p_month)::date;
  ob RECORD;
  include_row BOOLEAN;
BEGIN
  FOR ob IN
    SELECT *
    FROM public.financial_obligations
    WHERE user_id = p_user_id AND is_active = true
  LOOP
    include_row := false;
    IF ob.frequency IN ('monthly', 'quarterly', 'half_yearly') THEN
      include_row := true;
    ELSIF ob.frequency = 'yearly' THEN
      include_row := (ob.due_month IS NULL OR ob.due_month = EXTRACT(MONTH FROM month_start)::int);
    ELSIF ob.frequency = 'one_time' THEN
      include_row := (
        ob.due_date IS NOT NULL
        AND date_trunc('month', ob.due_date)::date = month_start
      );
    ELSE
      include_row := true;
    END IF;

    IF include_row THEN
      INSERT INTO public.obligation_checklist (
        user_id, obligation_id, checklist_month, expected_amount, status
      )
      VALUES (
        p_user_id, ob.id, month_start, COALESCE(ob.amount, 0), 'pending'
      )
      ON CONFLICT (user_id, obligation_id, checklist_month) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_monthly_checklist(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_monthly_checklist(UUID, DATE) TO service_role;
