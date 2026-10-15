import { adminAccessSection } from "./admin";
import {
  competitionSection,
  growthSection,
  phasesSection,
  revenueSection,
  userNeedSection,
  visionSection,
} from "./business";
import { planReviewSection } from "./planReview";
import { hldSection, lldSection, securitySection } from "./architecture";
import {
  billsSection,
  feedbackAccountSection,
  notificationsSection,
  paymentsSection,
  rewardsSection,
  splitSection,
  trackerSection,
} from "./featuresMoney";
import {
  analyseSection,
  calculatorsSection,
  fixPlanSection,
  policiesSection,
  profileSection,
} from "./featuresPlan";
import { afterLoginSection, beforeLoginSection } from "./journeys";
import { overviewSection, radioSection, techStackSection } from "./startHere";
import type { DocGroup, DocSection } from "./types";

/**
 * Admin console documentation, in sidebar order. Import only from server
 * components behind the admin check (app/admin) so it never reaches a
 * public bundle.
 */
export const ADMIN_DOC_SECTIONS: readonly DocSection[] = [
  overviewSection,
  techStackSection,
  radioSection,
  visionSection,
  userNeedSection,
  phasesSection,
  planReviewSection,
  competitionSection,
  growthSection,
  revenueSection,
  hldSection,
  lldSection,
  securitySection,
  beforeLoginSection,
  afterLoginSection,
  analyseSection,
  fixPlanSection,
  trackerSection,
  billsSection,
  splitSection,
  profileSection,
  policiesSection,
  calculatorsSection,
  notificationsSection,
  rewardsSection,
  paymentsSection,
  feedbackAccountSection,
  adminAccessSection,
];

export const DEFAULT_ADMIN_SECTION = "overview";

export function getAdminDocSection(id: string): DocSection | undefined {
  return ADMIN_DOC_SECTIONS.find((s) => s.id === id);
}

export function adminDocNav(): Array<{
  group: DocGroup;
  items: Array<Pick<DocSection, "id" | "title">>;
}> {
  const groups: Array<{
    group: DocGroup;
    items: Array<Pick<DocSection, "id" | "title">>;
  }> = [];
  for (const s of ADMIN_DOC_SECTIONS) {
    let g = groups.find((x) => x.group === s.group);
    if (!g) {
      g = { group: s.group, items: [] };
      groups.push(g);
    }
    g.items.push({ id: s.id, title: s.title });
  }
  return groups;
}

export type { ApiDoc, DocBlock, DocGroup, DocSection } from "./types";
