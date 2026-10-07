import type { GoalType } from "@/lib/goalDetection";
import { goalKnowledgeFor } from "@/lib/rag/goalKnowledge";
import { supabaseAdmin } from "@/lib/supabaseServer";

export interface KnowledgeChunk {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  appliesWhen: string;
  priorityContext: string[];
}

export function buildKeywords(profile: any, analysis: any): string[] {
  const kw: string[] = [];
  const stage = profile.lifeStage || "single";
  if (stage === "single" || stage === "bachelor") kw.push("single", "bachelor");
  if (stage === "married") kw.push("married");
  if (stage === "kids") kw.push("married", "kids");
  kw.push("emergency fund", "health insurance", "term insurance");

  if ((profile.educationLoanEMI || 0) > 0) kw.push("education loan", "80e");
  if ((profile.personalLoanEMI || 0) > 0) kw.push("personal loan");
  if ((profile.homeLoanEMI || 0) > 0) kw.push("home loan", "home purchase");
  if ((profile.parentsSupport || 0) > 0) kw.push("bereavement", "dependent parents");
  if (profile.planningBaby) kw.push("maternity", "pregnancy");

  const goal = String(profile.primaryGoal || "").toLowerCase();
  if (goal.includes("home") || goal.includes("house")) kw.push("home purchase");
  if (goal.includes("car")) kw.push("car purchase");
  if (goal.includes("bike")) kw.push("bike purchase");
  if (goal.includes("marriage")) kw.push("marriage planning");
  if (goal.includes("fire") || goal.includes("wealth")) kw.push("fire", "wealth goal");

  if ((analysis?.needsActual || 0) > 0 && (profile.savingsAccountBalance || 0) > (analysis?.needsActual || 0) * 3) {
    kw.push("mis", "monthly income scheme");
  }
  return Array.from(new Set(kw));
}

export async function retrieveKnowledge(profile: any, analysis: any, limit = 10): Promise<KnowledgeChunk[]> {
  const keywords = buildKeywords(profile, analysis);
  try {
    const { data, error } = await supabaseAdmin.rpc("search_by_keywords", {
      search_keywords: keywords,
      match_count: limit,
    });

    if (error || !data || data.length === 0) return [];
    return data.map((row: any) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      keywords: row.keywords || [],
      appliesWhen: row.applies_when || "",
      priorityContext: row.priority_context || [],
    }));
  } catch {
    return [];
  }
}

export function formatForPrompt(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "";
  return `
RETRIEVED FINANCIAL KNOWLEDGE:
Use ONLY these facts and rates.
Do not add rates from your training data.
These are current as of 2024.

${chunks
  .map(
    (c, i) => `
[RULE ${i + 1}] ${c.title}
${c.content}
`,
  )
  .join("\n---\n")}
`.trim();
}

/**
 * Reference content for one goal type: `finkoin_knowledge` rows tagged
 * `goal:<type>` / `goal:any`, falling back to the bundled copy when the table
 * is missing or has no goal rows yet.
 */
export async function retrieveGoalKnowledge(
  type: GoalType,
  limit = 4,
): Promise<Array<{ title: string; content: string }>> {
  try {
    const { data, error } = await supabaseAdmin.rpc("search_by_keywords", {
      search_keywords: [`goal:${type}`, "goal:any"],
      match_count: limit,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({ title: row.title, content: row.content }));
    }
  } catch {
    // fall through to bundled content
  }
  return goalKnowledgeFor(type)
    .slice(0, limit)
    .map(({ title, content }) => ({ title, content }));
}
