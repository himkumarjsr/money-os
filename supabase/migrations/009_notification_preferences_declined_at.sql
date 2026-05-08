ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;
