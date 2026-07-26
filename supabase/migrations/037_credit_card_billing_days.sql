-- Per-card billing / due days for tracker credit cards.
-- Also relax last4 (app collects nickname + dates; last4 optional).

CREATE TABLE IF NOT EXISTS public.user_credit_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nickname text NOT NULL,
  last4 text,
  billing_day integer CHECK (
    billing_day IS NULL OR (billing_day >= 1 AND billing_day <= 31)
  ),
  due_day integer CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_credit_cards
  ADD COLUMN IF NOT EXISTS billing_day integer;

ALTER TABLE public.user_credit_cards
  ADD COLUMN IF NOT EXISTS due_day integer;

ALTER TABLE public.user_credit_cards
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- last4 was NOT NULL in early manual SQL; make optional if present.
DO $$
BEGIN
  ALTER TABLE public.user_credit_cards ALTER COLUMN last4 DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

ALTER TABLE public.user_credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_credit_cards_own" ON public.user_credit_cards;
CREATE POLICY "user_credit_cards_own"
  ON public.user_credit_cards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.expense_transactions
  ADD COLUMN IF NOT EXISTS payment_card_id uuid REFERENCES public.user_credit_cards (id) ON DELETE SET NULL;

ALTER TABLE public.expense_transactions
  ADD COLUMN IF NOT EXISTS payment_card_label text;
