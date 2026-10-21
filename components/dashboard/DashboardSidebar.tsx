"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import {
  ACCOUNT_NAV,
  ACCOUNT_NAV_GROUPS,
  isAccountNavActive,
  type AccountNavItem,
} from "@/lib/accountNav";
import Link from "next/link";
import { usePathname } from "next/navigation";

function SidebarLink({
  item,
  active,
}: {
  item: AccountNavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-[#EEEDFE] font-semibold text-[#534AB7]"
          : "text-[#3D3A5C] hover:bg-[#F4F2FC] hover:text-[#534AB7]"
      }`}
    >
      <AppIcon name={item.icon} size={17} color="#534AB7" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Desktop-only (lg+) left rail for signed-in pages. */
export default function DashboardSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside
      aria-label="Account navigation"
      className="sticky top-[76px] hidden max-h-[calc(100dvh-92px)] w-60 shrink-0 self-start overflow-y-auto rounded-2xl border border-[#F0EFF8] bg-white p-3 lg:block"
    >
      <nav className="text-sm">
        <SidebarLink
          item={ACCOUNT_NAV.dashboard}
          active={isAccountNavActive(pathname, ACCOUNT_NAV.dashboard.href)}
        />
        {ACCOUNT_NAV_GROUPS.map((group) => (
          <div key={group.heading} className="mt-4">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#9B9A94]">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={isAccountNavActive(pathname, item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
