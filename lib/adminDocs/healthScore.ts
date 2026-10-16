import type { DocSection } from "./types";

/** How the 0–100 financial health score is worked out (lib/financialEngine.ts). */
export const healthScoreSection: DocSection = {
  id: "health-score",
  title: "Health score",
  group: "Features",
  summary:
    "How the 0–100 financial health score is calculated: every rule, threshold and penalty.",
  blocks: [
    {
      kind: "p",
      text: "The health score is `overallScore` from `analyseFinances(profile)` in `lib/financialEngine.ts` (byte-identical copy in `mobile/lib/`). It runs on the device from the Analyse answers, with no API call. The same number is shown on `/analyse/result`, the profile page, the PDF report, the Fix Plan (`scoreToday`) and the AI plan prompt.",
    },
    { kind: "h", text: "The formula" },
    {
      kind: "code",
      title: "lib/financialEngine.ts",
      code: "score = clamp(0, 100, 100 − 15 × critical − 7 × warning − 2 × info)",
    },
    {
      kind: "list",
      items: [
        "Everyone starts at 100. Each problem found takes points off: a critical issue −15, a warning −7. `info` issues would cost −2, but no rule produces one today.",
        "Things that are fine are recorded as `good` issues and cost nothing. They only feed the green messages on the report.",
        "The result is clamped to 0–100, so with many problems the score stops at 0.",
        "Colour bands (`SCORE_BANDS`): 70–100 green, 40–69 amber, 0–39 red.",
        "Duplicate issue codes are removed before counting, so one problem is never charged twice.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "The score counts problems; it does not weight how big they are. Being ₹1 over a cap and ₹50,000 over a cap both cost the same once they land in the same severity. Severity tiers (warning vs critical) are how size is reflected.",
    },
    { kind: "h", text: "Every rule that can cost points" },
    {
      kind: "p",
      text: "`buildIssues()` checks these in order. Income is monthly take-home: salary + spouse income (unless single) + other income.",
    },
    {
      kind: "table",
      head: ["Check", "Critical (−15)", "Warning (−7)", "Fine (0)"],
      rows: [
        [
          "No income entered",
          "Income is 0. This is the only issue returned, so the score is 85",
          "—",
          "—",
        ],
        [
          "Needs bucket vs cap",
          "Spend above cap × 1.15",
          "Above cap, up to cap × 1.15",
          "At or under cap",
        ],
        [
          "Wants bucket vs cap",
          "Above cap × 1.15",
          "Above cap, up to cap × 1.15",
          "At or under cap",
        ],
        [
          "Insurance premiums bucket vs cap",
          "Above cap × 1.15",
          "Above cap, up to cap × 1.15",
          "At or under cap",
        ],
        [
          "Loans (all EMIs + card bills) vs cap",
          "Above cap × 1.15",
          "Above cap, up to cap × 1.15",
          "At or under cap",
        ],
        [
          "Investment bucket vs cap",
          "—",
          "—",
          "Always fine: investing more than the cap is never penalised",
        ],
        [
          "Insurance spend floor",
          "Monthly premiums below 2% of income",
          "—",
          "2% or more",
        ],
        [
          "Emergency fund",
          "Short of target and covers under 3 months of needs",
          "Short of target but covers 3+ months",
          "At or above target",
        ],
        [
          "Unallocated cash",
          "—",
          "More than 10% of income is left unassigned, or the buckets add up to more than income by over 10%",
          "Within ±10%",
        ],
        [
          "Monthly investing",
          "Nothing invested each month",
          "Investing under 10% of income",
          "10% or more",
        ],
        [
          "Term insurance",
          "No term policy, or sum assured is 0",
          "Cover below both ₹1 Cr and the adequacy floor (half of cover needed, minimum ₹50L)",
          "Cover ≥ needed, ≥ ₹1 Cr, or ≥ the adequacy floor",
        ],
        [
          "Medical emergency fund",
          "Below the medical target",
          "—",
          "At or above target",
        ],
      ],
    },
    {
      kind: "p",
      text: "So the most a profile can lose is 4 bucket criticals + insurance floor + emergency + investing + term + medical (9 × 15) + unallocated cash (7) = 142 points, which clamps to 0.",
    },
    { kind: "h", text: "How each input is worked out" },
    {
      kind: "table",
      head: ["Input", "Rule", "Code"],
      rows: [
        [
          "Bucket caps",
          "% of income by life stage. Single under 30: Needs 30, Wants 5, Insurance 7, Loans 30, Investment 28. Single / married: 30, 5, 10, 30, 25. With kids: 33, 5, 12, 28, 22. Senior: 40, 7, 15, 10, 28",
          "`LIFE_STAGE_SPLITS`, `getProfileCaps()` in `lib/universal-buckets.ts`",
        ],
        [
          "Cap adjustments",
          "Income below the city band: Needs +10, Loans −5, Investment −5. Above the band: Needs −5, Investment +5. Supports parents: Insurance +3, Investment −3. Has a home loan: Loans +5, Investment −5. Age 45–59 (not senior): Loans −5, Investment +5. Floors: Wants 5, Insurance 7, Investment 15 (shortfall comes out of Needs)",
          "`INCOME_BANDS` (metro ₹40k–₹3L, tier 2 ₹30k–₹2L, tier 3 ₹20k–₹1.5L), `CAP_FLOORS`",
        ],
        [
          "Smart budget",
          "If the user turned on the Tracker's smart budget (3 months of tracked spending), its caps replace the profile caps until the Analyse answers change",
          "`getActiveSmartBudget()`",
        ],
        [
          "Emergency fund counted",
          "Savings 100% + liquid MF 95% + FD 70% + other liquid 50% + the old emergency-fund field 100%",
          "`computeRealEmergencyFund()`",
        ],
        [
          "Emergency target",
          "Monthly Needs × months. Single: 6 months (9 if supporting parents). Married, no kids: 9. With kids or senior: 12. Otherwise 6, or 12 from age 50",
          "`emergencyFundMonthsNeeded()`",
        ],
        [
          "Unallocated cash",
          "Income − (Needs + Wants + Insurance + Loans + Investment excluding employee EPF, which is deducted before take-home)",
          "`getUnallocatedIncome()`",
        ],
        [
          "Investment rate",
          "Monthly SIP + RD + NPS + PPF + EPF + SSY + LIC / endowment premiums + custom investments, as a % of income",
          "`getUniversalBucketActuals().investment`",
        ],
        [
          "Term cover needed",
          "max(₹50L, (10 × annual income + home and car loans outstanding + ₹20L per dependant − equity, PPF, EPF, FD and other investments) × age factor), rounded up to ₹10L. Age factor 1.2 under 30, 1.0 under 40, 0.8 under 50, 0.6 from 50. Dependants: spouse (unless single), each child, parents if supported",
          "`calculateTermNeeded()`, `assessTermCover()`",
        ],
        [
          "Medical emergency target",
          "₹3L metro, ₹2.5L tier 2, ₹2L tier 3; +₹50k from age 45; +₹50k with kids. Compared with the medical emergency fund the user entered",
          "`medicalEmergencyTarget()`",
        ],
      ],
    },
    { kind: "h", text: "Worked example" },
    {
      kind: "p",
      text: "Married, 32, metro, take-home ₹1,50,000, home loan, no kids. Caps: Needs 30%, Wants 5%, Insurance 10%, Loans 35%, Investment 20%. Spends ₹48,000 on needs (cap ₹45,000, within 15%, so a warning), has no term plan (critical), an emergency fund of 4 months against a 9-month target (warning), and no medical emergency fund (critical). Everything else is fine.",
    },
    {
      kind: "code",
      title: "Score",
      code: "100 − 15 × 2 (term, medical) − 7 × 2 (needs, emergency) = 56 → amber",
    },
    { kind: "h", text: "What the score does not use" },
    {
      kind: "list",
      items: [
        "The security checklist (health cover, parents' medical, bereavement fund, child goals, post office schemes) is shown on the report but does not change the score.",
        "Net worth, assets and liabilities are shown but not scored.",
        "Tracker spending does not change the score, except through the optional smart budget caps above. The score only changes when the user retakes Analyse.",
      ],
    },
    { kind: "h", text: "Score after 12 months (Fix Plan)" },
    {
      kind: "p",
      text: "The Fix Plan's projected score is `min(100, scoreToday + round(0.7 × gain))`, where gain = 15 per open critical priority + 8 per high + 4 per medium (`lib/priorityEngine.ts`). The 0.7 assumes most, not all, fixes get done within a year.",
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Changing any threshold above changes every user's score the next time their report is computed. Update this page and `lib/financialEngine.test.ts` with it.",
    },
  ],
};
