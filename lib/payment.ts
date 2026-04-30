export async function canAccessFixPlan(
  user: any,
  supabase: any,
): Promise<{
  canAccess: boolean;
  reason: string;
  fkBalance: number;
}> {
  if (user?.isAdmin || process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true") {
    return {
      canAccess: true,
      reason: "admin",
      fkBalance: 500,
    };
  }

  if (user?.subscriptionTier === "pro" || user?.subscriptionTier === "promax") {
    return {
      canAccess: true,
      reason: "subscription",
      fkBalance: user?.fkBalance || 0,
    };
  }

  if (supabase && user?.id) {
    const { data } = await supabase.from("user_analysis").select("ai_fix_plan").eq("user_id", user.id).single();
    if (data?.ai_fix_plan) {
      return {
        canAccess: true,
        reason: "previously_purchased",
        fkBalance: user?.fkBalance || 0,
      };
    }
  }

  return {
    canAccess: false,
    reason: "payment_required",
    fkBalance: user?.fkBalance || 0,
  };
}

export async function redeemFKTokens(userId: string, supabase: any, amount: number): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: gami } = await supabase.from("gamification").select("fk_balance").eq("user_id", userId).single();
    if (!gami || gami.fk_balance < amount) return false;

    const { error } = await supabase
      .from("gamification")
      .update({
        fk_balance: gami.fk_balance - amount,
      })
      .eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}
