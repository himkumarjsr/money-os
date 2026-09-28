/** Marker stored in `split_invitations.invited_email` for shareable open links. */
export const OPEN_SPLIT_INVITE_EMAIL = "__open__@finkoin.invite";

export function isOpenSplitInvite(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase().trim() === OPEN_SPLIT_INVITE_EMAIL;
}
