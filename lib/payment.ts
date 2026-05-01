export async function canAccessFixPlan(
  user: any,
  supabase: any,
): Promise<{
  access: boolean;
  reason: string;
}> {
  // Skip payment for dev/testing
  if (process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true") {
    console.log("canAccessFixPlan: skip payment enabled");
    return {
      access: true,
      reason: "skip",
    };
  }

  // Admin always has access
  if (user?.isAdmin) {
    return {
      access: true,
      reason: "admin",
    };
  }

  // Pro/promax subscription
  if (user?.subscriptionTier === "pro" || user?.subscriptionTier === "promax") {
    return {
      access: true,
      reason: "subscription",
    };
  }

  // Check if AI plan exists in DB
  if (supabase && user?.id) {
    const { data } = await supabase.from("user_analysis").select("ai_fix_plan").eq("user_id", user.id).single();
    if (data?.ai_fix_plan) {
      return {
        access: true,
        reason: "existing_plan",
      };
    }
  }

  return {
    access: false,
    reason: "payment_required",
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
