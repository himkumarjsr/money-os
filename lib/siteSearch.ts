/**
 * App-wide search: the index entry shape, the app pages every platform lists,
 * and the matcher. Pure code with no imports, so mobile/lib/siteSearch.ts is a
 * byte-identical copy (see lib/siteSearch.test.ts). Each platform builds its
 * own entries from its own Learn, blog, calculator and feature content.
 */

export type SearchKind = "feature" | "calculator" | "learn" | "blog" | "page";

export type SearchEntry = {
  kind: SearchKind;
  title: string;
  /** One line shown under the title. */
  description: string;
  /** Web path; mobile maps it to a native route. */
  href: string;
  /** Extra words that should find this entry (synonyms, abbreviations). */
  keywords?: string[];
  /** Short label such as the Learn or blog category. */
  tag?: string;
};

export type SearchResult = SearchEntry & { score: number };

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  feature: "Features",
  page: "App",
  calculator: "Calculators",
  learn: "Learn",
  blog: "Blog",
};

/** Display order of groups in the results list. */
export const SEARCH_KIND_ORDER: SearchKind[] = [
  "feature",
  "page",
  "calculator",
  "learn",
  "blog",
];

/** App screens that are not a feature card, calculator or article. */
export const APP_PAGES: SearchEntry[] = [
  {
    kind: "page",
    title: "Financial health check",
    description: "Get your money health score and what to fix first",
    href: "/analyse",
    keywords: ["analyse", "analyze", "score", "report", "checkup"],
  },
  {
    kind: "page",
    title: "Expense tracker",
    description: "Log spends and income, see where the month went",
    href: "/tracker",
    keywords: ["expenses", "spends", "budget", "transactions", "cash"],
  },
  {
    kind: "page",
    title: "Settle Up",
    description: "Split bills with friends and groups",
    href: "/split",
    keywords: ["split", "splitwise", "friends", "group", "share bill"],
  },
  {
    kind: "page",
    title: "Bills calendar",
    description: "Due dates for EMIs, rent, cards and premiums",
    href: "/bills",
    keywords: ["due date", "reminder", "emi", "rent", "credit card bill"],
  },
  {
    kind: "page",
    title: "Goals",
    description: "Plan and fund goals like a house, car or retirement",
    href: "/goals",
    keywords: ["goal", "target", "saving for"],
  },
  {
    kind: "page",
    title: "Net worth and investments",
    description: "Assets, loans and what you own today",
    href: "/investments",
    keywords: ["assets", "liabilities", "net worth", "holdings"],
  },
  {
    kind: "page",
    title: "Portfolio",
    description: "Your mutual funds, stocks and other holdings",
    href: "/portfolio",
    keywords: ["mutual funds", "stocks", "holdings", "allocation"],
  },
  {
    kind: "page",
    title: "Optimizer",
    description: "Find where your money can work harder",
    href: "/optimizer",
    keywords: ["optimise", "optimize", "improve"],
  },
  {
    kind: "page",
    title: "Insurance",
    description: "Check your term and health cover",
    href: "/insurance",
    keywords: ["term", "health", "cover", "policy"],
  },
  {
    kind: "page",
    title: "My policies",
    description: "Insurance policies you have saved",
    href: "/policies",
    keywords: ["insurance", "policy", "premium", "renewal"],
  },
  {
    kind: "page",
    title: "Household",
    description: "Link two accounts as one household",
    href: "/household",
    keywords: ["family", "spouse", "partner", "joint"],
  },
  {
    kind: "page",
    title: "Rewards",
    description: "FK coins, streaks and badges",
    href: "/rewards",
    keywords: ["fk", "coins", "points", "badges", "streak"],
  },
  {
    kind: "page",
    title: "Refer a friend",
    description: "Invite friends and earn rewards",
    href: "/refer",
    keywords: ["referral", "invite", "code"],
  },
  {
    kind: "page",
    title: "Leaderboard",
    description: "See how your streak compares",
    href: "/leaderboard",
    keywords: ["rank", "ranking"],
  },
  {
    kind: "page",
    title: "Plans and pricing",
    description: "Free and Pro plans",
    href: "/plans",
    keywords: ["pricing", "pro", "premium", "subscription", "upgrade"],
  },
  {
    kind: "page",
    title: "Notifications",
    description: "Reminders and updates",
    href: "/notifications",
    keywords: ["alerts", "reminders"],
  },
  {
    kind: "page",
    title: "Settings",
    description: "Theme, privacy, account and data",
    href: "/settings",
    keywords: ["theme", "dark mode", "privacy", "delete account", "account"],
  },
  {
    kind: "page",
    title: "All calculators",
    description: "Every Finkoin money calculator",
    href: "/calculators",
    keywords: ["calculator", "tools"],
  },
  {
    kind: "page",
    title: "Learn",
    description: "Free personal finance guides for India",
    href: "/learn",
    keywords: ["guides", "articles", "education"],
  },
  {
    kind: "page",
    title: "Blog",
    description: "Money guides and updates",
    href: "/blog",
    keywords: ["articles", "posts"],
  },
  {
    kind: "page",
    title: "All features",
    description: "Everything Finkoin can do",
    href: "/features",
    keywords: ["features", "what can finkoin do"],
  },
  {
    kind: "page",
    title: "Contact us",
    description: "Get help or send feedback",
    href: "/contact",
    keywords: ["help", "support", "email", "feedback"],
  },
  {
    kind: "page",
    title: "About Finkoin",
    description: "Who we are and how Finkoin works",
    href: "/about",
    keywords: ["company", "team"],
  },
];

/**
 * Short forms people type, expanded so "pf" finds "Provident Fund" and
 * "emi" finds loan pages. Keys and values are already normalised.
 */
const SYNONYMS: Record<string, string[]> = {
  pf: ["epf", "provident"],
  epf: ["provident"],
  ppf: ["provident"],
  emi: ["loan"],
  sip: ["mutual"],
  mf: ["mutual"],
  fd: ["fixed", "deposit"],
  rd: ["recurring", "deposit"],
  nps: ["pension"],
  hra: ["rent"],
  itr: ["return", "tax"],
  tds: ["tax"],
  ltcg: ["capital", "gains"],
  stcg: ["capital", "gains"],
  ssy: ["sukanya"],
  scss: ["senior"],
  ef: ["emergency"],
  insurance: ["cover"],
  cover: ["insurance"],
  budget: ["expense", "tracker"],
  expense: ["tracker", "spend"],
  split: ["settle"],
  retire: ["retirement"],
};

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normaliseSearchText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/₹/g, " rs ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  const n = normaliseSearchText(text);
  return n ? n.split(" ") : [];
}

type Field = { words: string[]; text: string; weight: number };

function fieldsOf(entry: SearchEntry): Field[] {
  const f = (text: string, weight: number): Field => ({
    words: tokens(text),
    text: normaliseSearchText(text),
    weight,
  });
  return [
    f(entry.title, 10),
    f((entry.keywords ?? []).join(" "), 6),
    f(entry.tag ?? "", 3),
    f(entry.description, 3),
  ];
}

/** Best score of one query token across the entry's fields, 0 if absent. */
function tokenScore(token: string, fields: Field[]): number {
  let best = 0;
  for (const field of fields) {
    for (const word of field.words) {
      let s = 0;
      if (word === token) s = 1;
      else if (word.startsWith(token)) s = token.length >= 2 ? 0.75 : 0.4;
      else if (token.length >= 4 && word.includes(token)) s = 0.4;
      if (s * field.weight > best) best = s * field.weight;
    }
  }
  return best;
}

function scoreEntry(queryTokens: string[], phrase: string, entry: SearchEntry) {
  const fields = fieldsOf(entry);
  let total = 0;
  for (const token of queryTokens) {
    let s = tokenScore(token, fields);
    if (s === 0) {
      // Fall back to a synonym at a discount ("pf" → "provident").
      for (const alt of SYNONYMS[token] ?? []) {
        s = Math.max(s, tokenScore(alt, fields) * 0.7);
      }
    }
    if (s === 0) return 0; // every word must match something
    total += s;
  }
  const title = fields[0].text;
  if (phrase && title === phrase) total += 12;
  else if (phrase && title.startsWith(phrase)) total += 8;
  else if (phrase.length >= 3 && title.includes(phrase)) total += 4;
  // Features and app screens edge ahead of articles on a tie.
  if (entry.kind === "feature" || entry.kind === "page") total += 0.5;
  else if (entry.kind === "calculator") total += 0.3;
  return total;
}

/**
 * Rank entries for a query. Every query word must match (exactly, as a prefix,
 * inside a longer word, or via a known short form). Duplicate hrefs keep the
 * best-scoring entry.
 */
export function searchEntries(
  entries: readonly SearchEntry[],
  query: string,
  limit = 30,
): SearchResult[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];
  const phrase = queryTokens.join(" ");
  const byHref = new Map<string, SearchResult>();
  for (const entry of entries) {
    const score = scoreEntry(queryTokens, phrase, entry);
    if (score <= 0) continue;
    const prev = byHref.get(entry.href);
    if (!prev || prev.score < score)
      byHref.set(entry.href, { ...entry, score });
  }
  return [...byHref.values()]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/**
 * Results bucketed by kind, empty groups dropped. The group holding the best
 * match comes first; ties keep SEARCH_KIND_ORDER.
 */
export function groupSearchResults(
  results: readonly SearchResult[],
): { kind: SearchKind; label: string; items: SearchResult[] }[] {
  return SEARCH_KIND_ORDER.map((kind) => ({
    kind,
    label: SEARCH_KIND_LABEL[kind],
    items: results.filter((r) => r.kind === kind),
  }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.items[0].score - a.items[0].score);
}

/** Shown before the user types. */
export const POPULAR_SEARCHES = [
  "Tax regime",
  "SIP",
  "Emergency fund",
  "Home loan",
  "Term insurance",
  "PPF",
  "Split bills",
  "Retirement",
];
