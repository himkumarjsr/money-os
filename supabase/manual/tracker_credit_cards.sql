-- Optional: persistent credit cards for tracker (client also keeps a localStorage fallback).
-- Run in Supabase SQL Editor if you want cross-device card lists.

CREATE TABLE IF NOT EXISTS public.user_credit_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nickname text NOT NULL,
  last4 text NOT NULL CHECK (char_length(last4) = 4),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nickname, last4)
);

ALTER TABLE public.user_credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_credit_cards_own" ON public.user_credit_cards;
CREATE POLICY "user_credit_cards_own"
  ON public.user_credit_cards
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional columns on expenses (app encodes card on payment_method today; columns for future use)
ALTER TABLE public.expense_transactions
  ADD COLUMN IF NOT EXISTS payment_card_id uuid REFERENCES public.user_credit_cards (id) ON DELETE SET NULL;

ALTER TABLE public.expense_transactions
  ADD COLUMN IF NOT EXISTS payment_card_label text;
