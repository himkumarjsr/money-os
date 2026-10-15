import Link from "next/link";
import type { ReactNode } from "react";
import { adminDocNav } from "@/lib/adminDocs";

function NavLinks({ active }: { active: string }) {
  return (
    <nav className="space-y-5">
      {adminDocNav().map(({ group, items }) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9B9A94]">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isActive = item.id === active;
              return (
                <li key={item.id}>
                  <Link
                    href={`/admin/${item.id}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-[#EEEDFE] font-semibold text-[#534AB7]"
                        : "text-[#5F5E5A] hover:bg-[#F7F7F4] hover:text-[#111110]"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  active,
  activeTitle,
  email,
  children,
}: {
  active: string;
  activeTitle: string;
  email: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F7F4] pb-28 md:pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#534AB7]">
              Finkoin admin
            </p>
            <p className="text-sm text-[#5F5E5A]">
              System design and business logic
            </p>
          </div>
          <span className="rounded-full border border-[#E8E6F0] bg-white px-3 py-1 text-xs text-[#5F5E5A]">
            Signed in as {email}
          </span>
        </div>

        {/* Small screens: the sidebar folds into a menu. */}
        <details className="mb-4 rounded-2xl border border-[#E8E6F0] bg-white lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#111110]">
            Sections · <span className="text-[#534AB7]">{activeTitle}</span>
          </summary>
          <div className="border-t border-[#F0EFF8] p-3">
            <NavLinks active={active} />
          </div>
        </details>

        <div className="flex gap-6">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-[#E8E6F0] bg-white p-3">
              <NavLinks active={active} />
            </div>
          </aside>
          <main className="min-w-0 flex-1 rounded-2xl border border-[#E8E6F0] bg-white p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
