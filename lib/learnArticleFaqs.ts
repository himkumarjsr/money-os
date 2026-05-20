import type { LearnArticle } from "@/lib/learnContent";
import type { LearnFaq } from "@/components/learn/LearnFaqAccordion";

const FAQS: Record<string, LearnFaq[]> = {
  "how-your-cibil-credit-score-is-calculated": [
    {
      q: "What is a good CIBIL score in India?",
      a: "Most lenders prefer 750+. Below 700 you may face higher rates or rejection. Scores run from 300 to 900.",
    },
    {
      q: "What hurts my CIBIL score the fastest?",
      a: "Late or missed EMI/credit-card payments (35% weight) and high credit utilisation (30%) — using most of your card limit every month.",
    },
    {
      q: "How can I improve my score in 90 days?",
      a: "Pay every bill on time, keep card utilisation under 30%, avoid new loan inquiries unless necessary, and fix errors on your bureau report.",
    },
    {
      q: "Why is a “settled” loan dangerous?",
      a: "Settled (not fully paid) accounts stay on your report for years and signal lenders you did not honour the full obligation — worse than a clean closure.",
    },
  ],
  "sip-vs-lumpsum-when-to-use-which": [
    {
      q: "Is SIP always better than lumpsum?",
      a: "No. SIP smooths entry when markets are high; lumpsum can win after deep corrections. Many investors use STP — lumpsum into liquid, then systematic transfer to equity.",
    },
    {
      q: "When should I use lumpsum?",
      a: "When you have a large amount, a long horizon, and can tolerate short-term volatility — or when deploying a bonus with a clear goal date far away.",
    },
    {
      q: "What is STP?",
      a: "Systematic Transfer Plan: park money in a liquid fund and move fixed amounts to equity monthly — a hybrid between lumpsum and SIP discipline.",
    },
    {
      q: "Does SIP remove market risk?",
      a: "No. SIP reduces timing risk but equity SIPs still fall in bear markets. Match the asset class to your goal timeline.",
    },
  ],
  "how-home-loan-tax-benefits-work-80c-24b": [
    {
      q: "Can I claim both 80C principal and 24(b) interest?",
      a: "Yes, on eligible home loans: principal (within the ₹1.5L 80C basket) and interest under Section 24(b) subject to caps and possession rules.",
    },
    {
      q: "Do under-construction loans get 24(b) benefit?",
      a: "Interest during construction is treated differently — often aggregated and claimed in limited instalments after possession. Pre-possession EMIs may disappoint if you assumed full yearly deduction.",
    },
    {
      q: "Does the new tax regime allow home loan deductions?",
      a: "Most Chapter VI-A deductions including 24(b) and 80C home-loan principal matter under the old regime. Compare both regimes annually.",
    },
    {
      q: "Can joint owners both claim benefits?",
      a: "Yes, if co-owners are also co-borrowers and each pays their share — benefits split per ownership and payment proof.",
    },
  ],
  "what-is-the-50-30-20-budgeting-rule": [
    {
      q: "Why does 50-30-20 fail for many Indians?",
      a: "It assumes stable social safety nets and lower inflation on essentials. Indian rent, medical, and education costs often need a higher “needs” and “save/invest” share before lifestyle.",
    },
    {
      q: "What is Finkoin’s 40-20-10-30 framework?",
      a: "40% essentials, 20% investing, 10% insurance/health buffer, 30% lifestyle — prioritising wealth building and protection before discretionary spend.",
    },
    {
      q: "Should I follow percentages exactly?",
      a: "No. Use them as starting ratios and tune for your city, dependents, and EMIs. The point is intentional buckets, not rigid labels.",
    },
    {
      q: "Where does emergency fund fit?",
      a: "Build emergency cash before aggressive investing. Many people fund it from the “invest” bucket until 6–12 months of essentials are covered.",
    },
  ],
  "ppf-vs-elss-which-is-better-for-tax-saving": [
    {
      q: "PPF or ELSS — which saves more tax?",
      a: "Both use the same ₹1.5L Section 80C cap. Tax saved is identical for the same amount; the difference is risk, lock-in, and long-term wealth.",
    },
    {
      q: "How long is ELSS locked?",
      a: "Each ELSS instalment has a three-year lock-in. PPF has a 15-year horizon with extension options — much longer but government-backed.",
    },
    {
      q: "Is ELSS safe like PPF?",
      a: "No. ELSS is equity — NAV can fall 30–50% in bad years. Use ELSS only for goals 7–10+ years away, not for money you need soon.",
    },
    {
      q: "Can I do both PPF and ELSS?",
      a: "Yes, but combined 80C deduction stays capped at ₹1.5 lakh per financial year.",
    },
  ],
  "understanding-inflation-and-your-real-returns": [
    {
      q: "What is a real return?",
      a: "Return after inflation (and ideally after tax). A 7% FD with 6% inflation and tax may barely preserve purchasing power.",
    },
    {
      q: "Should I trust headline CPI only?",
      a: "CPI is an average basket. Your personal inflation (school fees, rent, medical) may run higher — model your own expenses.",
    },
    {
      q: "What is the Rule of 72?",
      a: "Divide 72 by the annual rate to estimate years to double money. At 8% nominal, ~9 years; at 8% with 6% inflation, real doubling takes much longer.",
    },
    {
      q: "How does inflation affect long-term goals?",
      a: "A ₹50L goal today may need ₹1.2Cr+ in 15 years at 6% inflation — SIP targets must rise over time, not stay flat.",
    },
  ],
  "section-80c-limits-and-beyond": [
    {
      q: "Is 80C the only tax deduction?",
      a: "No. 80D (health insurance), 80CCD(1B) (extra NPS ₹50k), 24(b) (home loan interest), 80E, 80TTA/80TTB, and others sit outside or beside the ₹1.5L basket.",
    },
    {
      q: "What counts inside the ₹1.5L 80C limit?",
      a: "EPF, PPF, ELSS, life insurance premium, home-loan principal (eligible portion), tuition fees, and more — all share one combined cap.",
    },
    {
      q: "Does new regime allow 80C?",
      a: "Most Chapter VI-A deductions including 80C matter under the old regime. New regime has fewer levers — compare both each year.",
    },
    {
      q: "What should I prioritise after maxing 80C?",
      a: "Often 80D for family health cover, then 80CCD(1B) if you want NPS, then home-loan interest if applicable — subject to eligibility.",
    },
  ],
  "what-is-health-insurance-floater": [
    {
      q: "What is a family floater plan?",
      a: "One sum insured shared across all covered family members. Any member can use up to the full limit; if one large claim exhausts it, others have nothing left that year.",
    },
    {
      q: "Floater vs individual policies?",
      a: "Floaters are cheaper per rupee of cover but risky if multiple members need care in the same year. Individual policies cost more but isolate claim risk.",
    },
    {
      q: "Should parents be on the same floater?",
      a: "Often no — senior parents’ claims can wipe the family limit. Separate senior policies or super top-ups are common.",
    },
    {
      q: "What is a super top-up?",
      a: "Additional cover that kicks in after a deductible (e.g. after ₹5L from base policy). Cheap way to raise total hospitalisation cover.",
    },
  ],
  "fixed-vs-floating-home-loan": [
    {
      q: "Is fixed rate always safer?",
      a: "Teaser fixed rates often reset to floating after a few years. Read the sanction letter — “fixed” marketing ≠ lifetime fixed rate.",
    },
    {
      q: "When does floating win?",
      a: "When you expect rates to fall or stay stable, and you can absorb EMI increases via income growth or prepayment discipline.",
    },
    {
      q: "Can I switch fixed to floating later?",
      a: "Many banks allow conversion for a fee. Compare conversion cost vs lifetime interest saved before switching.",
    },
    {
      q: "What matters more than fixed vs floating?",
      a: "Prepayment flexibility, spread over repo, processing fees, and your cashflow buffer — often beat the label on day one.",
    },
  ],
  "rera-basics-for-homebuyers": [
    {
      q: "What does RERA protect?",
      a: "Registered projects must meet disclosure norms, use escrow for collections, and give buyers complaint routes for delays and misrepresentation — when enforced.",
    },
    {
      q: "Is every project under RERA?",
      a: "No. Verify registration on your state RERA portal before paying. Unregistered projects lack these safeguards.",
    },
    {
      q: "What is carpet area?",
      a: "Usable floor area inside walls — RERA mandates quoting carpet area, not inflated super-built-up numbers.",
    },
    {
      q: "Can RERA fix a bad builder?",
      a: "It helps with structured remedies but cannot replace your diligence on title, approvals, and financial health of the developer.",
    },
  ],
  "what-is-asset-allocation": [
    {
      q: "What is asset allocation?",
      a: "How you split money across equity, debt, gold, and cash before picking individual funds — the biggest driver of long-term risk and return.",
    },
    {
      q: "Why not just pick the best fund?",
      a: "Fund rankings change every year. Your mix of asset classes explains most portfolio behaviour over decades (Brinson insight).",
    },
    {
      q: "How much equity should I hold?",
      a: "Rough heuristic: 100 minus age for equity % — tune for job stability, goals, and temperament. Younger/longer horizon → more equity.",
    },
    {
      q: "How often should I rebalance?",
      a: "Once a year or when any sleeve drifts ~5% from target. Rebalancing forces buy-low/sell-high discipline.",
    },
  ],
  "credit-card-minimum-trap": [
    {
      q: "Why is minimum due dangerous?",
      a: "Paying only the minimum keeps the rest revolving at 30–42% APR. A ₹50k balance can take years and cost multiples of the original purchase.",
    },
    {
      q: "Do I lose grace period after one miss?",
      a: "Often yes — new purchases may accrue interest from day one until the full statement balance is cleared.",
    },
    {
      q: "How do I escape the trap?",
      a: "Stop new spends on that card, pay more than minimum every month, or consolidate via a lower-cost personal loan if discipline is solid.",
    },
    {
      q: "Are reward points worth carrying balance?",
      a: "Almost never. Interest cost dwarfs cashback value unless you pay the full statement balance every month.",
    },
  ],
  "nps-vs-epf-for-retirement": [
    {
      q: "NPS or EPF — which is better?",
      a: "EPF offers employer match and familiar accrual; NPS adds market-linked growth and extra 80CCD(1B) deduction. Many salaried use both.",
    },
    {
      q: "Can I withdraw EPF when changing jobs?",
      a: "Partial/full withdrawal is possible but destroys compounding. Transfer to the new employer’s EPF when you can.",
    },
    {
      q: "What is the NPS ₹50k extra deduction?",
      a: "Section 80CCD(1B) allows up to ₹50,000 additional deduction for voluntary Tier-I NPS — outside the ₹1.5L 80C basket.",
    },
    {
      q: "Is NPS fully tax-free at maturity?",
      a: "No. A portion must be annuitised and taxation rules apply on lump-sum and pension — verify current law before planning withdrawals.",
    },
  ],
  "gold-as-investment-myths": [
    {
      q: "Is gold jewellery a good investment?",
      a: "Jewellery has making charges and GST — you lose 15–25% on day one. SGB, ETF, or digital gold are better for investment intent.",
    },
    {
      q: "How much gold should I own?",
      a: "Many planners suggest 5–10% of net worth as a diversifier — not the core retirement engine.",
    },
    {
      q: "SGB vs gold ETF?",
      a: "SGB offers sovereign backing and interest; ETFs are more liquid on exchange. Both beat physical gold for purity and storage.",
    },
    {
      q: "Does gold always beat inflation?",
      a: "Gold can lag equities for decades and spike in crises. It is insurance/diversifier, not a guaranteed inflation hedge every year.",
    },
  ],
  "prepayment-vs-tenure-reduction-home-loan": [
    {
      q: "Should I reduce EMI or tenure when prepaying?",
      a: "Tenure reduction usually saves more total interest. EMI reduction helps cashflow if you need lower monthly outgo — maths vs psychology.",
    },
    {
      q: "When does prepayment not make sense?",
      a: "When you lack emergency fund, have high-cost unsecured debt, or could earn more after-tax by investing — case-by-case.",
    },
    {
      q: "Does prepayment affect 24(b) tax benefit?",
      a: "Yes — less outstanding interest means smaller 24(b) deductions over time, especially late in the loan when interest dominates EMI.",
    },
    {
      q: "Is there a prepayment penalty?",
      a: "Most floating-rate home loans have no prepayment penalty on floating; verify your sanction letter for fixed-rate or commercial terms.",
    },
  ],
  "what-is-compound-interest-and-why-it-changes-everything": [
    {
      q: "What is compound interest in simple terms?",
      a: "Earning returns on your original money plus on past returns — a snowball. The formula A = P × (1 + r)^n captures lump-sum growth.",
    },
    {
      q: "How does compounding work in mutual funds?",
      a: "Units × rising NAV means future gains apply to a larger base. SIP adds fresh money monthly; growth option reinvests instead of paying out.",
    },
    {
      q: "What is the Rule of 72?",
      a: "Divide 72 by your annual return % to estimate years to double. At 8%, ~9 years — an approximation, not a promise.",
    },
    {
      q: "Why start early?",
      a: "Time in market gives more compounding periods. ₹5k/month for 30 years often beats ₹15k/month for 15 years at the same return in illustrations.",
    },
  ],
  "term-insurance-vs-endowment-why-most-indians-buy-wrong": [
    {
      q: "Term vs endowment — which should I buy?",
      a: "For pure protection, term insurance gives large cover at low premium. Endowment bundles small cover with savings — families often end up underinsured.",
    },
    {
      q: "How much term cover do I need?",
      a: "Roughly 10–15× annual income, adjusted for loans, children’s goals, and years of income replacement — minus existing assets.",
    },
    {
      q: "Why do people lapse policies?",
      a: "Premium too high relative to income. Buy cover you can pay for 20–30 years — a lapsed term policy means zero benefit.",
    },
    {
      q: "Is endowment ever useful?",
      a: "Rarely for protection. Some use it for forced savings with low return expectations — but separate term + SIP often beats bundled products.",
    },
  ],
  "what-is-an-index-fund-and-why-it-beats-most-mutual-funds": [
    {
      q: "What is an index fund?",
      a: "A mutual fund that copies a benchmark (e.g. Nifty 50) with minimal trading — low cost, broad diversification.",
    },
    {
      q: "Why do index funds beat most active funds?",
      a: "Lower expense ratios and fewer bad bets. SPIVA data shows most active funds underperform their benchmark over 10+ years after fees.",
    },
    {
      q: "What expense ratio should I target?",
      a: "Direct index plans often charge 0.1–0.3%. Every 1% extra fee compounds against you over decades.",
    },
    {
      q: "Index fund vs ETF?",
      a: "Both track indices. ETFs trade on exchange like stocks; index funds are bought via AMC platforms. Pick based on convenience and costs.",
    },
  ],
  "emergency-fund-how-much-where-to-keep-it": [
    {
      q: "How much emergency fund should I have in India?",
      a: "Count one month as essential expenses only (rent, EMIs, groceries, fees, insurance). Build toward up to 12 months — higher if you have dependents or volatile income.",
    },
    {
      q: "Where should I keep emergency money?",
      a: "Liquid mutual funds, sweep FDs, or a dedicated savings account — accessible in 1–2 business days. Avoid equity and long lock-ins.",
    },
    {
      q: "Is 12 months too much?",
      a: "Twelve months of essentials is a strong ceiling for cash. Beyond that, term insurance and diversified investments usually add safety more efficiently.",
    },
    {
      q: "Should I rebuild after using it?",
      a: "Yes. Pause discretionary SIP increases if needed, but refill the bucket before taking new risks — otherwise the next shock hits debt or investments.",
    },
  ],
};

function genericFaqs(article: LearnArticle): LearnFaq[] {
  return [
    {
      q: `What is this guide about?`,
      a: article.subtitle,
    },
    {
      q: "Is this personalised financial advice?",
      a: "No. Finkoin Learn articles are educational. Verify rates, rules, and product terms with your bank, insurer, CA, or a qualified professional before acting.",
    },
    {
      q: "How often is this updated?",
      a: "We refresh guides when rules or market norms shift materially. Tax and regulatory topics may change each Finance Act — always cross-check the current year.",
    },
    {
      q: "Can I use Finkoin tools with this article?",
      a: "Yes. Calculators and the financial health check on Finkoin help you model numbers discussed here — use them alongside official sources.",
    },
  ];
}

export function getLearnArticleFaqs(articleId: string, article?: LearnArticle): LearnFaq[] {
  if (FAQS[articleId]) return FAQS[articleId];
  if (article) return genericFaqs(article);
  return genericFaqs({
    id: articleId,
    title: "This topic",
    subtitle: "Educational personal finance guidance for India.",
    category: "Basics",
    content: [],
    readTime: 5,
  });
}

export function tocWithFaq(toc: { id: string; label: string }[]): { id: string; label: string }[] {
  if (toc.some((t) => t.id === "faq")) return toc;
  return [...toc, { id: "faq", label: "FAQs" }];
}
