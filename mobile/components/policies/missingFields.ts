/**
 * Port of web `lib/analysePolicyImport.missingPolicyFields`: the fields a
 * policy still needs before it is complete (empty when complete).
 */
export type MissingPolicyField =
  | "insurer"
  | "renewal date"
  | "cover"
  | "premium";

export function missingPolicyFields(p: {
  insurerName: string;
  renewalDate: string | null;
  coverAmount: number;
  premiumAmount: number;
}): MissingPolicyField[] {
  const out: MissingPolicyField[] = [];
  if (!p.insurerName.trim()) out.push("insurer");
  if (!p.renewalDate) out.push("renewal date");
  if (!(p.coverAmount > 0)) out.push("cover");
  if (!(p.premiumAmount > 0)) out.push("premium");
  return out;
}
