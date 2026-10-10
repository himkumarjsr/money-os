-- Account deletion was failing with "Database error deleting user" because the
-- Split tables referenced auth.users with ON DELETE NO ACTION. Anyone who had
-- paid for, created, settled or invited into a Split group could not be deleted.
--
-- Shared group history stays (other members rely on it, and every row already
-- keeps the person's email / display name); only the link to the deleted
-- auth user is cleared. Membership rows keep ON DELETE CASCADE.

ALTER TABLE public.split_expenses
  DROP CONSTRAINT IF EXISTS split_expenses_paid_by_user_id_fkey,
  ADD CONSTRAINT split_expenses_paid_by_user_id_fkey
    FOREIGN KEY (paid_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.split_expenses
  DROP CONSTRAINT IF EXISTS split_expenses_created_by_fkey,
  ADD CONSTRAINT split_expenses_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.split_expense_shares
  DROP CONSTRAINT IF EXISTS split_expense_shares_user_id_fkey,
  ADD CONSTRAINT split_expense_shares_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.split_settlements
  DROP CONSTRAINT IF EXISTS split_settlements_from_user_id_fkey,
  ADD CONSTRAINT split_settlements_from_user_id_fkey
    FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.split_settlements
  DROP CONSTRAINT IF EXISTS split_settlements_to_user_id_fkey,
  ADD CONSTRAINT split_settlements_to_user_id_fkey
    FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.split_invitations
  DROP CONSTRAINT IF EXISTS split_invitations_invited_by_fkey,
  ADD CONSTRAINT split_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.split_group_members
  DROP CONSTRAINT IF EXISTS split_group_members_invited_by_fkey,
  ADD CONSTRAINT split_group_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
