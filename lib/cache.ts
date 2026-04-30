const CACHE_KEY = "finkoin_ai_cache";
const CACHE_MAX_AGE_DAYS = 30;

interface CachedPlan {
  profileHash: string;
  aiPlan: any;
  projection: any;
  generatedAt: string;
}

export function hashProfile(profile: any): string {
  const relevant = {
    monthlySalary: profile.monthlySalary,
    spouseIncome: profile.spouseIncome,
    lifeStage: profile.lifeStage,
    selfAge: profile.selfAge,
    numberOfKids: profile.numberOfKids,
    kids: profile.kids,
    city: profile.city,
    emergencyFund: profile.emergencyFund,
    termInsuranceCover: profile.termInsuranceCover,
    healthInsuranceCover: profile.healthInsuranceCover,
    homeLoanEMI: profile.homeLoanEMI,
    educationLoanEMI: profile.educationLoanEMI,
    personalLoanEMI: profile.personalLoanEMI,
    monthlyRent: profile.monthlyRent,
    foodGroceries: profile.foodGroceries,
    monthlySIP: profile.monthlySIP,
    epfBalance: profile.epfBalance,
    primaryGoal: profile.primaryGoal,
    fdValue: profile.fdValue,
    savingsAccountBalance: profile.savingsAccountBalance,
    parentsSupport: profile.parentsSupport,
    planningBaby: profile.planningBaby,
  };

  const str = JSON.stringify(relevant);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function getCachedPlan(profileHash: string): CachedPlan | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored) as CachedPlan;
    if (cached.profileHash !== profileHash) return null;

    const generatedAt = new Date(cached.generatedAt);
    const daysSince = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > CACHE_MAX_AGE_DAYS) return null;

    return cached;
  } catch {
    return null;
  }
}

export function setCachedPlan(profileHash: string, aiPlan: any, projection: any): void {
  try {
    const cache: CachedPlan = {
      profileHash,
      aiPlan,
      projection,
      generatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore full localStorage
  }
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export async function saveToSupabase(
  userId: string,
  supabase: any,
  profileHash: string,
  profile: any,
  analysisResult: any,
  aiPlan: any,
): Promise<void> {
  if (!supabase || !userId) return;
  try {
    await supabase.from("user_analysis").upsert(
      {
        user_id: userId,
        profile_hash: profileHash,
        profile,
        analysis_result: analysisResult,
        ai_fix_plan: aiPlan,
        ai_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch (err) {
    console.warn("Supabase save failed:", err);
  }
}

export async function loadFromSupabase(
  userId: string,
  supabase: any,
): Promise<{
  profileHash: string;
  profile: any;
  analysisResult: any;
  aiPlan: any;
} | null> {
  if (!supabase || !userId) return null;
  try {
    const { data } = await supabase.from("user_analysis").select("*").eq("user_id", userId).single();
    if (!data) return null;
    return {
      profileHash: data.profile_hash,
      profile: data.profile,
      analysisResult: data.analysis_result,
      aiPlan: data.ai_fix_plan,
    };
  } catch {
    return null;
  }
}
