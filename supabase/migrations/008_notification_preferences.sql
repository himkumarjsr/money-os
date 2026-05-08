-- Notification preferences + finance tips

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_consent boolean DEFAULT false,
  push_consent boolean DEFAULT false,
  morning_tips boolean DEFAULT true,
  weekly_summary boolean DEFAULT true,
  payment_alerts boolean DEFAULT true,
  marketing boolean DEFAULT false,
  preferred_time text DEFAULT '08:00',
  timezone text DEFAULT 'Asia/Kolkata',
  email_consent_at timestamptz,
  push_consent_at timestamptz,
  consent_version text DEFAULT 'v1',
  push_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_pref_own" ON public.notification_preferences;

CREATE POLICY "notif_pref_own"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.finance_tips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  day_of_week integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.finance_tips (title, content, category, day_of_week)
VALUES
  (
    'Emergency Fund Goal',
    'Your emergency fund should cover 6-9 months of expenses. Start with Rs 1,000 this week in a liquid mutual fund. Small steps compound into big security.',
    'savings', 1
  ),
  (
    'Term Insurance Rule of 10',
    'Your term insurance cover should be at least 10x your annual income. At Rs 12L income, you need Rs 1.2 crore minimum. Check your gap today.',
    'insurance', 2
  ),
  (
    '80C Deadline Reminder',
    'March 31 is the last date for 80C investments. Max out Rs 1.5 lakh to save up to Rs 46,800 in tax. ELSS funds give best returns with 3-year lock-in.',
    'tax', 3
  ),
  (
    'SIP Power of Compounding',
    'Rs 5,000/month SIP at 12% for 20 years = Rs 49.9 lakhs. Start today, not tomorrow. Time in market beats timing the market.',
    'investment', 4
  ),
  (
    'Credit Card Trap',
    'Paying minimum due on credit card = 36-48% annual interest. Pay full amount every month. Credit cards are free money only if you pay on time.',
    'debt', 5
  ),
  (
    'Weekend Challenge',
    'This weekend: check if your bank FD rate is the best available. Bajaj Finance offers 8.25% vs SBI at 7%. Move to earn Rs 500-2000 more per year.',
    'savings', 6
  ),
  (
    'Weekly Financial Review',
    'Take 10 minutes today: check your Finkoin expense tracker, review this week spending vs budget, and plan next week. Small reviews prevent big surprises.',
    'general', 0
  )
ON CONFLICT DO NOTHING;
