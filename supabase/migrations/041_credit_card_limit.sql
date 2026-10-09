-- Optional credit limit per tracker card (usage vs limit in Credit card dues).
-- The app keeps working before this runs: it loads cards with select("*"),
-- retries saves without credit_limit, and keeps the limit in the local cache.

ALTER TABLE public.user_credit_cards
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12, 2) CHECK (
    credit_limit IS NULL OR credit_limit > 0
  );
