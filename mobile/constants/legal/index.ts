import { DELETE_ACCOUNT } from "./deleteAccount";
import { DISCLAIMER } from "./disclaimer";
import { PRIVACY_POLICY } from "./privacy";
import { REFUND_POLICY } from "./refund";
import { TERMS_OF_SERVICE } from "./terms";
import type { LegalDoc } from "./types";

export type { LegalDoc, LegalSection } from "./types";
export { DELETE_ACCOUNT_WIDGET } from "./deleteAccount";

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
  refund: REFUND_POLICY,
  disclaimer: DISCLAIMER,
  "delete-account": DELETE_ACCOUNT,
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS);

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS[slug];
}
