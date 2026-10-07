import type { Faq } from "@/components/content/FaqAccordion";
import { LEARN_WIDGETS, type LearnGuideBody } from "../types";

const FAQS: Faq[] = [
  { q: "What is the difference between FY and AY?", a: "FY (Financial Year) is when you earn income (1 Apr to 31 Mar). AY (Assessment Year) is when you file and the Income Tax Department assesses that FY’s income." },
  { q: "FY 2025-26 means what dates?", a: "Income earned from 1 April 2025 to 31 March 2026." },
  { q: "AY 2026-27 means what?", a: "The year in which you typically file the return for FY 2025-26 (and the department assesses it)." },
  {
    q: "Which ITR should a salaried employee usually file?",
    a: "If you are a resident with only salary + bank interest + one eligible house property (and no restricted incomes), ITR-1 is common. If you have capital gains (Indian or foreign stocks/MF), foreign income/assets reporting, or multiple house-property complexity, you usually move to ITR-2. Always confirm on the Income Tax Department’s ITR selection guidance for the year.",
  },
  {
    q: "I invest in US stocks (via an Indian broker or LRS). Which ITR?",
    a: "US equity sales typically create capital gains schedules (and may involve foreign income/asset reporting depending on your case). That is usually not an ITR-1-only situation—most salaried people end up on ITR-2 (subject to eligibility). If you also have business income, ITR-3 may apply. Verify with AIS/broker statements and the official ITR wizard.",
  },
  { q: "Is ITR filing mandatory if my tax is zero?", a: "It can be mandatory in specific cases (high-value transactions, foreign assets, etc.). Even when not mandatory, filing helps with refunds, visa/income proof, and continuity." },
  { q: "How much income is tax-free in India?", a: "It depends on the regime and the rebate rules (e.g., Section 87A) for that year. Always compute taxable income first, then apply rebate/cess." },
  { q: "What is Form 16?", a: "A certificate issued by your employer showing salary paid and TDS deducted. It is a key document for salaried filing." },
  { q: "What is 26AS and AIS?", a: "Form 26AS shows tax credits like TDS/TCS. AIS (Annual Information Statement) and TIS show broader transaction/income information used for matching." },
  { q: "What is TDS in salary?", a: "Tax Deducted at Source. Employers deduct estimated tax monthly and deposit it with the government." },
  { q: "Can I switch between old and new regime every year?", a: "Many salaried individuals can choose each year at filing time. Rules can differ for business income cases; check the current-year conditions." },
  { q: "What is Section 80C?", a: "A deduction section (up to the notified limit) covering common investments/expenses like EPF, PPF, ELSS, life insurance premium, etc., subject to rules." },
  { q: "What is Section 80D?", a: "Deduction for eligible health insurance premium and certain medical expenses, subject to limits and conditions." },
  { q: "What is standard deduction?", a: "A flat deduction from salary/pension as per rules for that year/regime." },
  { q: "What is cess?", a: "Health & Education cess is applied as a percentage on computed tax (after surcharge where applicable) as per current rules." },
  { q: "What is surcharge?", a: "Additional tax on high total income above certain thresholds; it affects the effective tax rate." },
  { q: "What are 234A/234B/234C interest sections?", a: "These are interest provisions for late filing (234A), shortfall of advance tax (234B), and deferment of advance tax installments (234C), generally computed per month when applicable." },
  { q: "Which documents do I need to file ITR?", a: "PAN, Aadhaar, Form 16, AIS/26AS, bank interest certificates, capital gains statements (if any), and proofs for deductions/exemptions you claim." },
  { q: "What is e-verification?", a: "The final verification step after filing (OTP, netbanking, etc.). Without verification within the allowed time, the return is treated as not filed." },
  { q: "Are capital gains taxed like salary slabs?", a: "Often no. Many capital gains have separate rates and rules. Always compute capital gains separately as required." },
  { q: "Is FD interest taxable?", a: "Yes, FD/RD interest is generally taxable as ‘Income from Other Sources’ and may also have TDS." },
  { q: "Do I need to report savings account interest?", a: "Yes. It is income, though you may be eligible for deduction under sections like 80TTA/80TTB (subject to conditions)." },
  { q: "What is ITR-4 (Sugam)?", a: "An ITR form commonly used for eligible presumptive income cases (small business/profession) as per the law." },
  { q: "What if AIS shows something I didn’t earn?", a: "Reconcile with your records and raise feedback/correction on the portal where applicable. Don’t ignore mismatches." },
  { q: "How do refunds work?", a: "If total TDS/advance tax is more than final tax liability, you can get a refund after processing. Ensure bank details are correct." },
  { q: "What is marginal relief?", a: "A relief that can reduce the harsh jump in tax when surcharge triggers; it ensures the additional tax doesn’t exceed the income above threshold by too much, as per rules." },
  { q: "What are common mistakes that cause notices?", a: "Not matching AIS/26AS, forgetting bank/FD interest, incorrect ITR selection, missing e-verification, and claiming unsupported deductions." },
  { q: "Where do I file online?", a: "On the official Income Tax e-Filing portal. Use only the official website and verify the URL." },
  { q: "What is PAN and why is it important?", a: "PAN is your unique tax identifier used across filings, TDS credits, AIS, and many financial transactions." },
  { q: "Who is a resident vs non-resident?", a: "Residency depends on day-count rules under the Income-tax Act and affects scope of income taxed. Check the current rules for your situation." },
  { q: "Can ITR help for visa/income proof?", a: "Yes. Filed ITRs are commonly used as income proof for loans and visas." },
  { q: "Do I need to file if I have foreign assets?", a: "Often yes; foreign assets/income can trigger mandatory filing and additional disclosures. Verify your exact case." },
  { q: "What is self-assessment tax?", a: "Tax you pay if there’s remaining liability after TDS/advance tax, paid before filing." },
  { q: "What is advance tax?", a: "Tax paid in installments during the year if your tax liability crosses the specified threshold, common for non-salary income." },
  { q: "How do I pick between regimes quickly?", a: "List real deductions/exemptions you can claim. If the list is large, old regime may win; if small, new regime often wins. Then confirm using a calculator." },
  { q: "Is this page official tax advice?", a: "No. It’s educational. Use it to understand concepts, then verify the current-year rules and your eligibility before filing." },
  { q: "Can I edit my return after filing?", a: "Revisions are possible within allowed time windows if the law permits. Check current-year timelines on the official portal." },
  { q: "What is ITR-2 used for?", a: "Often used when you have capital gains or multiple houses/foreign assets but no business income. Eligibility conditions apply." },
  { q: "What is ITR-3 used for?", a: "Commonly for business/professional income cases, including certain capital gains/other income combinations." },
  { q: "Does employer regime declaration lock me?", a: "Not always. You can often choose at filing time; however, TDS may be impacted. Verify rules for your case." },
];

/** Port of components/learn/tax/IncomeTaxGuideFY2526.tsx. */
export const INCOME_TAX_GUIDE: LearnGuideBody = {
  toc: [
    { id: "hero", label: "Start here" },
    { id: "what-is-tax", label: "What is income tax?" },
    { id: "fy-ay", label: "FY vs AY (timeline)" },
    { id: "who-files", label: "Who should file ITR?" },
    { id: "income-heads", label: "Types of income" },
    { id: "itr-forms", label: "ITR forms guide" },
    { id: "regimes", label: "Old vs new regime" },
    { id: "slabs", label: "Tax slabs + 87A/cess" },
    { id: "deductions", label: "Important deductions" },
    { id: "tds", label: "TDS + Form 16 + AIS" },
    { id: "how-to-file", label: "How to file online" },
    { id: "mistakes", label: "Common mistakes" },
  ],
  asideNote: "Updated for **FY 2025-26 (AY 2026-27)**.",
  faqs: FAQS,
  faqSubtitle:
    "Clear answers using official Income Tax terminology. Educational guidance only.",
  faqPlaceholder: "Search (e.g. ITR-1, FY vs AY, 80C)",
  sections: [
    {
      id: "hero",
      title: "Indian Income Tax Explained Simply (FY 2025-26)",
      subtitle:
        "Understand tax slabs, ITR filing, deductions, old vs new regime, and tax saving in one complete guide.",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Free financial health check",
              text: "Get a clear plan for savings, debt, and goals.",
              href: "/analyse",
            },
            {
              title: "Old vs new regime calculator",
              text: "Compare both regimes with real deductions.",
              href: "/calculators?calc=tax-regime",
            },
          ],
        },
        {
          kind: "callout",
          tone: "grey",
          text: "**Disclaimer:** This page is for educational purposes only and should not be considered professional tax advice. Always verify current-year rules/limits and your eligibility on the official portal / CBDT notifications.",
        },
      ],
    },
    {
      id: "what-is-tax",
      title: "What is income tax? (and why it exists)",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Income tax (direct tax)",
              text: "A tax on income earned by a person or entity. For salaried people, it is usually deducted as TDS by the employer and later reconciled in the ITR.",
            },
            {
              title: "Indirect tax",
              text: "Taxes included in prices of goods/services (example: GST). You don’t “file” GST as a salaried employee, but you pay it as a consumer.",
            },
            {
              title: "Who needs to pay?",
              text: "If your taxable income exceeds the tax-free thresholds (after deductions/rebates), you pay. Even when tax is zero, filing may still be beneficial or required.",
            },
            {
              title: "PAN matters",
              text: "PAN is your core tax identifier. It links your TDS credits, AIS/26AS, filings, and many bank/investment transactions.",
            },
          ],
        },
      ],
    },
    {
      id: "fy-ay",
      title: "Financial Year (FY) vs Assessment Year (AY) — the simplest way to remember",
      subtitle: "Beginners get stuck here. This clears it in 20 seconds.",
      blocks: [
        {
          kind: "cards",
          tone: "grey",
          items: [
            {
              title: "FY 2025-26",
              text: "Income earned between **1 Apr 2025** → **31 Mar 2026**.",
            },
            {
              title: "AY 2026-27",
              text: "You typically file the return for FY 2025-26 in **2026** — that filing year is AY 2026-27.",
            },
          ],
        },
        { kind: "p", small: true, muted: true, text: "**TIMELINE**" },
        {
          kind: "cards",
          items: [
            { title: "Earn income", text: "Apr 2025 → Mar 2026" },
            { title: "TDS/advance tax happens", text: "During FY while income is earned" },
            { title: "File ITR", text: "In AY 2026-27" },
          ],
        },
      ],
    },
    {
      id: "who-files",
      title: "Who should file ITR? (even if tax is zero)",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Common reasons to file",
              text: "Refund due (TDS deducted more than final tax), income proof for loans/visa, record continuity, and to avoid issues when AIS/26AS has entries.",
            },
            {
              title: "Mandatory filing cases (examples)",
              text: "Certain high-value transactions, foreign assets/income, and other notified conditions can make filing mandatory. Always verify the current-year rules.",
            },
          ],
        },
      ],
    },
    {
      id: "income-heads",
      title: "Types (heads) of income in India",
      blocks: [
        {
          kind: "table",
          headers: ["Income head", "What it means", "Example"],
          rows: [
            ["Salary", "Employment income", "Monthly salary, bonus"],
            ["House Property", "Income from property", "Rental income"],
            ["Business & Profession", "Self-employment income", "Freelancing, shop income"],
            ["Capital Gains", "Profit on selling assets", "Stocks, mutual funds, property"],
            ["Other Sources", "Miscellaneous income", "FD interest, savings interest"],
          ],
          boldFirstCol: true,
        },
      ],
    },
    {
      id: "itr-forms",
      title: "Which ITR should I file? (ITR-1 to ITR-7 explained with examples)",
      subtitle:
        "Use this as a map — the final form must match the Income Tax Department’s eligibility rules for that year.",
      blocks: [
        {
          kind: "p",
          text: "Think in two steps: (1) list every type of income you earned (salary, rent, business, capital gains, foreign interest, etc.), then (2) pick the **lowest-number ITR that legally covers all of them**. If you are unsure, use the official e-filing portal’s ITR selection / help or consult a qualified professional.",
        },
        {
          kind: "table",
          headers: [
            "ITR",
            "Who it is for (plain English)",
            "Typical “signals” you belong here",
            "Usually NOT the right pick if…",
          ],
          rows: [
            [
              "ITR-1 (Sahaj)",
              "Resident individuals with simple salary + small other income patterns (strict eligibility).",
              "Form 16 only, bank interest, one eligible house property scenario, no capital gains schedules.",
              "You sold stocks/MF/property, you have foreign income, you need multiple house-property reporting, or income types exceed ITR-1 limits.",
            ],
            [
              "ITR-2",
              "Individuals/HUFs without business/profession income but with capital gains, more than one house property, or foreign income/asset reporting (as applicable).",
              "Equity/MF sales, RSU vesting gains, rental from multiple properties, foreign dividends/interest, overseas brokerage statements.",
              "You have business/profession books (P&L) beyond presumptive limits.",
            ],
            [
              "ITR-3",
              "Individuals/HUFs having income under “Profits and gains of business or profession”.",
              "Freelancer with full books, partner in a firm, consultant billing clients with detailed accounting.",
              "You only have salary + interest and no business income (ITR-1/2 may be enough).",
            ],
            [
              "ITR-4 (Sugam)",
              "Presumptive taxation schemes for eligible small businesses/professions (turnover/limits apply).",
              "Eligible shop owner / freelancer choosing presumptive scheme under law.",
              "You are outside presumptive limits or need detailed P&L reporting (often ITR-3).",
            ],
            [
              "ITR-5",
              "Partnership firms, LLPs, AOP/BOI, artificial juridical persons (not a typical salaried individual form).",
              "You are filing for an LLP/firm entity.",
              "You are filing as an individual salaried employee.",
            ],
            [
              "ITR-6",
              "Companies claiming exemption under specific sections (not individual).",
              "Company tax return workflows.",
              "Individual filing.",
            ],
            [
              "ITR-7",
              "Persons including companies required to furnish returns under specific trusts/political/refund sections (rare for salaried beginners).",
              "Trust/political party/special cases per law.",
              "Normal salaried employee scenarios.",
            ],
          ],
          boldFirstCol: true,
          scrollColWidth: 200,
        },
        { kind: "h3", text: "Quick “story” examples (beginner-friendly)" },
        {
          kind: "cards",
          items: [
            {
              title: "Example A — Only salary + bank interest",
              text: "**Rahul** has Form 16, ₹8,000 savings-account interest, no MF sales, no rent income. This is the classic “simple” profile that often maps to **ITR-1** if all eligibility conditions are met.",
            },
            {
              title: "Example B — US stocks / global MF / RSU sales",
              text: "**Neha** is salaried and also sold US stocks (capital gains) and received RSU-related perquisite/gain entries. Even if salary is simple, capital gains reporting usually pushes you away from a pure **ITR-1** path towards **ITR-2** (and you must reconcile broker statements with AIS). If she also runs a freelance practice with books, consider **ITR-3**.",
            },
            {
              title: "Example C — Crypto / frequent trading",
              text: "If you treat activity as investing (capital gains) vs business (trading) can change the return shape. Many retail investors need detailed schedules; do not assume ITR-1. When in doubt, use official guidance / a CA.",
            },
            {
              title: "Example D — Freelancer with invoices + expenses",
              text: "If you are not eligible for presumptive schemes (or exceed limits), you may need **ITR-3** with proper books. If you qualify for presumptive taxation, **ITR-4** may apply.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "sky",
          text: "**Official help:** always cross-check on the [Income Tax e-Filing portal](https://www.incometax.gov.in/iec/foportal/) before submitting.",
        },
        {
          kind: "p",
          muted: true,
          text: "Next: regime math and deduction caps → [Old vs new tax regime — complete guide](/learn/old-vs-new-tax-regime-which-saves-you-more-money).",
        },
      ],
    },
    {
      id: "regimes",
      title: "Old tax regime vs new tax regime (what changes?)",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Old regime (deduction-friendly)",
              text: "Allows a wider set of deductions/exemptions (80C/80D/HRA-style, home loan interest within limits, etc.) but requires correct documentation.",
            },
            {
              title: "New regime (simpler)",
              text: "Fewer deductions/exemptions, but different slab structure. Often simpler for people with limited deductions.",
            },
          ],
        },
        { kind: "widget", widget: LEARN_WIDGETS.taxRegimeToggle },
      ],
    },
    {
      id: "slabs",
      title: "Latest tax slabs FY 2025-26 — what else matters besides slabs?",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "87A rebate",
              text: "A rebate (not a deduction) that can reduce tax sharply when taxable income is within the notified limits. The exact thresholds/rules can change.",
            },
            {
              title: "Surcharge + cess",
              text: "Surcharge applies at higher incomes; cess is a percentage applied on computed tax (after surcharge where applicable) as per rules.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "grey",
          text: "Want exact slabs and a full comparison table? Use the [tax regime calculator](/calculators?calc=tax-regime) and cross-check with current-year notifications.",
        },
      ],
    },
    {
      id: "deductions",
      title:
        "Most important tax-saving sections (with caps used in Finkoin’s FY 2025-26 calculator)",
      subtitle:
        "These limits match the deduction “caps” in our tax regime tool so what you read here matches what the calculator enforces. Always confirm final eligibility on the official law/notifications.",
      blocks: [
        {
          kind: "callout",
          tone: "emerald",
          text: "**Regime note:** deductions like 80C/80D/HRA/24(b) mostly matter under the **old regime** in typical salaried planning. The new regime in Finkoin currently models a higher **standard deduction** and generally fewer Chapter VI-A levers — compare both in the [tax regime calculator](/calculators?calc=tax-regime).",
        },
        {
          kind: "table",
          headers: [
            "Section / item",
            "What it does",
            "Cap in Finkoin FY2025-26 model",
            "Beginner checklist",
          ],
          rows: [
            [
              "Standard deduction (salary)",
              "Flat deduction from salary/pension in computations (auto benefit in payslip thinking).",
              "Old regime: **₹50,000**\nNew regime: **₹75,000**",
              "Don’t mentally double-count — good tools include this automatically.",
            ],
            [
              "HRA exemption",
              "Rent-related exemption when employer pays HRA (least-of tests).",
              "No single fixed rupee cap in the formula — depends on rent, salary structure, metro/non-metro.",
              "Keep rent agreement + receipts + bank transfers aligned; landlord PAN rules may apply for higher rents.",
            ],
            [
              "80GG (no HRA rent)",
              "If you pay rent but don’t get HRA, an old-regime style rent relief can exist subject to conditions.",
              "Finkoin uses an **illustrative** model capped at **₹60,000** (verify eligibility).",
              "Not a substitute for real HRA documentation rules — confirm on official utility.",
            ],
            [
              "80C (combined basket)",
              "EPF/VPF (eligible portion), PPF, ELSS, life insurance premium, principal repayment (eligible part), tuition fees, etc.",
              "**₹1,50,000** combined cap (extra items don’t create extra 80C room beyond the basket).",
              "If EPF is large, you may “fill” 80C without ELSS — check your payslip + 80C proofs.",
            ],
            [
              "80CCD(1B) (NPS)",
              "Additional NPS contribution deduction beyond the 80C basket (where eligible).",
              "**₹50,000**",
              "Great if you want disciplined retirement investing + tax planning (subject to product rules).",
            ],
            [
              "80D (medical insurance)",
              "Premium for self/family and parents (separate buckets in law).",
              "Self/family bucket (as modelled in Finkoin): **₹25,000** if your age is below 60, else **₹50,000**.\nParents’ premium bucket (as modelled): **₹25,000** if parents are not marked senior, else **₹50,000**.",
              "Parents’ senior status can materially change the cap — keep policy PDFs.",
            ],
            [
              "24(b) (home loan interest)",
              "Interest on home loan for self-occupied/let-out rules (as applicable).",
              "Finkoin caps self-occupied interest modelling at **₹2,00,000** (illustrative; let-out has different mechanics).",
              "Use lender interest certificate; don’t confuse principal (80C eligible part) vs interest (24(b)).",
            ],
            [
              "80EEA (affordable housing interest)",
              "Additional interest deduction for eligible affordable housing loans (conditions apply).",
              "**₹1,50,000** cap in tool (only if eligible in your facts)",
              "Eligibility is strict — verify sanction date/stamp duty rules for your year.",
            ],
            [
              "80E (education loan interest)",
              "Interest on loan taken for higher education (eligible lender/conditions).",
              "No fixed “₹ cap” in the calculator line — you enter eligible interest; law governs the allowed amount.",
              "Keep lender interest statements; note the “8 years” style rule in law (verify current wording).",
            ],
            [
              "80G (donations)",
              "Donations to eligible funds/institutions (percentages vary 50%/100% etc.).",
              "You enter **eligible** donation amounts; the tool doesn’t auto-split categories.",
              "Donation receipt + 80G certificate details must match.",
            ],
            [
              "80TTA (savings interest)",
              "Savings account interest (resident individuals, conditions apply).",
              "**₹10,000** for non-seniors in tool (seniors usually use 80TTB instead)",
              "FD/RD interest is generally **not** 80TTA — it’s taxable “other sources”.",
            ],
            [
              "80TTB (senior interest)",
              "Senior citizens: interest on specified deposits (conditions apply).",
              "**₹50,000**",
              "Seniors should check whether 80TTA vs 80TTB applies to their interest types.",
            ],
            [
              "80DD / 80DDB / 80U",
              "Disability / critical illness / self-disability deductions (highly fact-specific).",
              "80DD: **₹1,25,000** cap in tool\n80DDB: **₹40,000** (non-senior) / **₹1,00,000** (senior band in tool)\n80U: **₹1,25,000** cap in tool",
              "Keep medical certificates/disability certificates as per law.",
            ],
            [
              "Professional tax",
              "State professional tax paid (where applicable).",
              "**₹5,000** cap in tool",
              "Usually visible on payslip; don’t claim more than actually paid.",
            ],
            [
              "80RRB (royalty)",
              "Royalty income for authors/inventors (eligibility applies).",
              "Illustrative cap **₹3,00,000** in tool",
              "Rare for typical salaried employees — ignore unless it truly applies.",
            ],
          ],
          boldFirstCol: true,
          scrollColWidth: 210,
        },
        {
          kind: "cards",
          items: [
            {
              title: "LTA (Leave Travel Allowance)",
              text: "LTA is an **allowance/exemption** story (not a fixed “80C-style” line item in the calculator table). If your employer pays LTA, exemption depends on actual eligible travel bills and employer policy — keep tickets/invoices as per rules.",
            },
            {
              title: "“Super deductions” mistake to avoid",
              text: "You cannot “stack” two laws to claim the same expense twice. Example: home loan interest belongs in the house-property logic (24(b)/related) — don’t confuse with unrelated sections.",
            },
          ],
        },
      ],
    },
    {
      id: "tds",
      title: "TDS explained (salary) — Form 16, 26AS, AIS/TIS",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "TDS on salary",
              text: "Employer estimates annual tax and deducts monthly. Filing reconciles estimated TDS with final tax.",
            },
            {
              title: "Form 16",
              text: "Proof from employer showing salary and TDS. Use it to populate/verify salary figures.",
            },
            {
              title: "AIS / 26AS matching",
              text: "Your return should broadly match AIS/26AS. Many notices come from mismatches, not from “wrong tax saving”.",
            },
          ],
        },
      ],
    },
    {
      id: "how-to-file",
      title: "How to file ITR online (step-by-step)",
      blocks: [
        {
          kind: "ul",
          ordered: true,
          items: [
            "Login on the official Income Tax e-Filing portal using PAN.",
            "Select the correct ITR form (ITR-1/2/3/4 as applicable).",
            "Verify prefilled salary/TDS details against Form 16 and AIS/26AS.",
            "Add missing income (FD interest, capital gains, etc.) if applicable.",
            "Claim deductions/exemptions you are eligible for with correct details.",
            "Pay any self-assessment tax (if needed), then submit.",
            "Complete e-verification within the permitted time.",
          ],
        },
        {
          kind: "callout",
          tone: "rose",
          text: "**Common mistake:** forgetting to report bank/FD interest or failing to e-verify.",
        },
      ],
    },
    {
      id: "mistakes",
      title: "Common mistakes (and how to avoid them)",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Wrong ITR selection",
              text: "Always check eligibility before choosing ITR-1/2/3/4. If in doubt, consult a qualified professional.",
            },
            {
              title: "AIS mismatch",
              text: "Cross-check AIS/26AS. Add missing interest/capital gains if applicable.",
            },
            {
              title: "Claiming unsupported deductions",
              text: "Only claim what you’re eligible for, with evidence (rent receipts, loan certificates, etc.).",
            },
            {
              title: "Not e-verifying",
              text: "Submission is not complete until e-verified within the allowed time.",
            },
          ],
        },
      ],
    },
  ],
  afterFaq: [
    {
      id: "next",
      blocks: [
        {
          kind: "callout",
          tone: "grey",
          text: "Next: [Old vs new tax regime — complete guide →](/learn/old-vs-new-tax-regime-which-saves-you-more-money)",
        },
      ],
    },
  ],
};
