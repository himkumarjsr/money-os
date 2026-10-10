import type { Href } from "expo-router";
import { supabase } from "@/lib/supabase";

/** Group name from a Split expense inbox title ("New expense in Trip" → "Trip"). */
export function splitGroupNameFromTitle(title: string): string | null {
  const m = /^New expense in (.+)$/.exec(title.trim());
  const name = m?.[1]?.trim();
  return name && name !== "your group" ? name : null;
}

/**
 * Where an inbox Split expense message should open (same as web
 * lib/splitGroupLink.ts). Looks the group up by name among the groups this
 * user can see; falls back to the Split tab when missing or ambiguous.
 */
export async function splitGroupRouteForTitle(title: string): Promise<Href> {
  const name = splitGroupNameFromTitle(title);
  if (!name) return "/(tabs)/split";
  try {
    const { data } = await supabase
      .from("split_groups")
      .select("id")
      .eq("name", name)
      .limit(2);
    return data && data.length === 1
      ? { pathname: "/split/[groupId]", params: { groupId: String(data[0].id) } }
      : "/(tabs)/split";
  } catch {
    return "/(tabs)/split";
  }
}
