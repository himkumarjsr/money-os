-- Run in Supabase SQL Editor for expense tracker + consent (RLS).

CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12, 2) NOT NULL,
  category text NOT NULL,
  subcategory text,
  description text,
  bucket text NOT NULL,
  payment_method text DEFAULT 'cash',
  month text NOT NULL,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_own" ON public.expense_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tracker_consent (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  consent_given boolean DEFAULT false,
  consent_at timestamptz,
  consent_version text DEFAULT 'v1'
);

ALTER TABLE public.tracker_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracker_consent_own" ON public.tracker_consent FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
