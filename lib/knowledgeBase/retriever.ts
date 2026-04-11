import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import { KNOWLEDGE_BASE, type KnowledgeEntry } from "./entries";

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type ExtProfile = FinancialProfile & {
  educationLoanEMI?: number;
  planningBaby?: boolean;
};

function hasEducationLoan(profile: FinancialProfile): boolean {
  const ext = profile as ExtProfile;
  if (n(ext.educationLoanEMI) > 0) return true;
  return (profile.additionalObligations ?? []).some((o) => /education|student/i.test(o.type));
}

function hasGirlUnder10(profile: FinancialProfile): boolean {
  const nk = profile.numberOfKids ?? 0;
  const ages = profile.kidsAges ?? [];
  const g = profile.kidsGenders ?? [];
  for (let i = 0; i < nk; i++) {
    if (g[i] === "girl" && n(ages[i]) < 10) return true;
  }
  return false;
}

function kwMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!q || !t) return false;
  return t.includes(q) || q.includes(t);
}

/**
 * Keyword-based retrieval over the static Indian finance knowledge base.
 * Uses real `FinancialProfile` / `AnalysisResult` shapes (not legacy `profile.kids` arrays).
 */
export function retrieveRelevantKnowledge(
  profile: FinancialProfile,
  _analysis: AnalysisResult,
): KnowledgeEntry[] {
  void _analysis;
  const keywords: string[] = [];
  const ext = profile as ExtProfile;

  if (profile.lifeStage === "bachelor") {
    keywords.push("bachelor", "single");
  }

  if (hasEducationLoan(profile)) {
    keywords.push("education loan", "co-signer", "80e", "student loan");
  }

  if (ext.planningBaby) {
    keywords.push("baby", "pregnancy", "maternity", "planning baby");
  }

  if (n(profile.numberOfKids) > 0) {
    keywords.push("kids", "children", "education fund", "family floater");
  }

  if (hasGirlUnder10(profile)) {
    keywords.push("ssy", "sukanya", "girl child");
  }

  if (n(profile.selfAge) >= 50 || profile.lifeStage === "senior") {
    keywords.push("senior citizen", "scss", "retirement", "nps");
  }

  if (n(profile.fdValue) > 0) {
    keywords.push("kvp", "post office", "fd strategy");
  }

  if (!profile.hasTermInsurance || n(profile.termInsuranceSumAssured) === 0) {
    keywords.push("term insurance", "life cover");
  }

  if (!profile.hasHealthInsurance || n(profile.healthInsuranceSumInsured) < 500_000) {
    keywords.push("health insurance", "mediclaim");
  }

  if (n(profile.parentsSupport) > 0) {
    keywords.push("senior citizen", "parent insurance", "health insurance");
  }

  keywords.push("80c", "tax saving", "emergency fund");

  const scored = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;
    for (const kw of keywords) {
      if (entry.keywords.some((k) => kwMatch(kw, k))) {
        score += 1;
      }
      if (entry.content.toLowerCase().includes(kw.toLowerCase())) {
        score += 0.5;
      }
      if (entry.title.toLowerCase().includes(kw.toLowerCase())) {
        score += 0.25;
      }
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.entry);
}

export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  const blocks = entries.map(
    (e) => `[${e.title}] (source: ${e.source}, updated ${e.lastUpdated})\n${e.content.trim()}`,
  );

  return `
RELEVANT FINANCIAL KNOWLEDGE (verified snippets — cite rates/limits only as stated below; user profile numbers override illustrations):
${blocks.join("\n\n---\n\n")}
`;
}
