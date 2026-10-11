/**
 * Every way a user earns FK coins. Keep in step with the server: the amounts
 * are paid by award_fk / record_daily_login (supabase/migrations/045, 049),
 * app/api/feedback and app/api/referrals/apply.
 */
export const FK_EARN_ACTIONS: ReadonlyArray<readonly [string, string]> = [
  ["Welcome bonus (once)", "+50 FK"],
  ["Daily login", "+5 FK/day"],
  ["Refer a friend (they sign up)", "+200 FK"],
  ["Join with a friend's code", "+100 FK"],
  ["Your first feedback (once)", "+50 FK"],
];
