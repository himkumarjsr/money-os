import type { SupabaseClient } from "@supabase/supabase-js";

/** Group name from a Split expense inbox title ("New expense in Trip" → "Trip"). */
export function splitGroupNameFromTitle(title: string): string | null {
  const m = /^New expense in (.+)$/.exec(title.trim());
  const name = m?.[1]?.trim();
  return name && name !== "your group" ? name : null;
}

/**
 * Where an inbox Split expense message should open. Older messages only carry
 * the group name in their title, so look it up among the groups this user can
 * see (RLS); fall back to the Split list when it is missing or ambiguous.
 */
export async function splitGroupPathForTitle(
  supabase: SupabaseClient,
  title: string,
): Promise<string> {
  const name = splitGroupNameFromTitle(title);
  if (!name) return "/split";
  try {
    const { data } = await supabase
      .from("split_groups")
      .select("id")
      .eq("name", name)
      .limit(2);
    return data && data.length === 1 ? `/split/${data[0].id}` : "/split";
  } catch {
    return "/split";
  }
}
