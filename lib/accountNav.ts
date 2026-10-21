import type { AppIconName } from "@/components/ui/AppIcon";

/**
 * Signed-in destinations, shared by the navbar profile dropdown and the
 * dashboard sidebar so the two lists can't drift apart.
 */
export type AccountNavItem = {
  icon: AppIconName;
  label: string;
  href: string;
};

export const ACCOUNT_NAV = {
  dashboard: { icon: "home", label: "Dashboard", href: "/" },
  profile: { icon: "user", label: "My Profile", href: "/profile" },
  tracker: { icon: "notebook", label: "Expense Tracker", href: "/tracker" },
  bills: { icon: "calendar", label: "Bills & renewals", href: "/bills" },
  split: { icon: "users", label: "FK Split", href: "/split" },
  analysis: { icon: "chart", label: "My Analysis", href: "/analyse/result" },
  policies: { icon: "shield", label: "My Policies", href: "/policies" },
  goals: { icon: "target", label: "My Goals", href: "/goals" },
  investments: {
    icon: "trending",
    label: "My Investments",
    href: "/investments",
  },
  leaderboard: { icon: "trophy", label: "Leaderboard", href: "/leaderboard" },
  rewards: { icon: "gift", label: "Rewards", href: "/rewards" },
  refer: { icon: "users", label: "Refer & Earn", href: "/refer" },
  settings: { icon: "settings", label: "Settings", href: "/settings" },
} as const satisfies Record<string, AccountNavItem>;

/** Profile dropdown order (Dashboard first, then the original menu order). */
export const ACCOUNT_MENU_ITEMS: readonly AccountNavItem[] = [
  ACCOUNT_NAV.dashboard,
  ACCOUNT_NAV.profile,
  ACCOUNT_NAV.tracker,
  ACCOUNT_NAV.bills,
  ACCOUNT_NAV.split,
  ACCOUNT_NAV.analysis,
  ACCOUNT_NAV.policies,
  ACCOUNT_NAV.goals,
  ACCOUNT_NAV.investments,
  ACCOUNT_NAV.leaderboard,
  ACCOUNT_NAV.rewards,
  ACCOUNT_NAV.refer,
  ACCOUNT_NAV.settings,
];

/** Dashboard sidebar sections (Dashboard itself sits above these). */
export const ACCOUNT_NAV_GROUPS: readonly {
  heading: string;
  items: readonly AccountNavItem[];
}[] = [
  {
    heading: "Money",
    items: [
      ACCOUNT_NAV.tracker,
      ACCOUNT_NAV.bills,
      ACCOUNT_NAV.split,
      ACCOUNT_NAV.investments,
    ],
  },
  {
    heading: "Plan",
    items: [ACCOUNT_NAV.analysis, ACCOUNT_NAV.goals, ACCOUNT_NAV.policies],
  },
  {
    heading: "Rewards",
    items: [ACCOUNT_NAV.leaderboard, ACCOUNT_NAV.rewards, ACCOUNT_NAV.refer],
  },
  {
    heading: "Account",
    items: [ACCOUNT_NAV.profile, ACCOUNT_NAV.settings],
  },
];

/** True when `pathname` is `href` or a page under it. */
export function isAccountNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
