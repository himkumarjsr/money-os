-- Run manually in Supabase SQL Editor when rolling out referrals + avatars.
-- Adjust constraints/policies to match your project.

-- 1) Column for profile photo URL (if missing)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) Backfill referral codes for existing users (pattern matches client fallback)
UPDATE public.users
SET referral_code = lower(
  substring(regexp_replace(coalesce(name, 'user'), '\s', '', 'g'), 1, 6) || substring(id::text, 1, 4)
)
WHERE referral_code IS NULL OR referral_code = '';

-- 3) Storage bucket for avatars (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4) Example storage policies (tune paths / roles as needed)
-- DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
-- CREATE POLICY "Avatar upload policy" ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'avatars');

-- DROP POLICY IF EXISTS "Avatar read policy" ON storage.objects;
-- CREATE POLICY "Avatar read policy" ON storage.objects FOR SELECT TO public
--   USING (bucket_id = 'avatars');

-- DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
-- CREATE POLICY "Avatar update policy" ON storage.objects FOR UPDATE TO authenticated
--   USING (bucket_id = 'avatars');

-- 5) Optional: extend handle_new_user trigger to set referral_code + avatar_url defaults.
-- Copy from your existing migration and merge — do not duplicate-trigger blindly.
