"use client";

import { fadeIn } from "@/lib/animations";
import { useAuthStore } from "@/store/authStore";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGamificationStore } from "@/store/gamificationStore";

const centerNavItems = [
  { href: "/analyse", label: "Analyse" },
  { href: "/calculators", label: "Calculators" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/learn", label: "Learn" },
] as const;

export function GlobalNavbar() {
  const router = useRouter();
  const logoutAction = useAuthStore((s) => s.logout);
  const fkBalance = useGamificationStore((s) => s.fkBalance);
  const badges = useGamificationStore((s) => s.badges.length);
  const streakDays = useGamificationStore((s) => s.streakDays);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const subscriptionTier = useAuthStore((s) => s.user?.subscriptionTier ?? "free");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = profileMenuRef.current?.contains(target);
      const clickedProfileButton = profileButtonRef.current?.contains(target);
      if (!clickedInsideMenu && !clickedProfileButton) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [profileOpen]);

  const avatarLetter = useMemo(
    () => (user?.name?.trim()?.charAt(0) || "U").toUpperCase(),
    [user?.name],
  );

  return (
    <>
      <motion.header
        variants={fadeIn}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`sticky top-0 z-50 w-full border-b border-transparent transition-all duration-300 ${
          scrolled
            ? "border-indigo-100/70 bg-white/70 py-2 backdrop-blur-xl shadow-[0_8px_30px_rgba(76,60,180,0.14)]"
            : "bg-transparent py-3"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" scroll className="flex items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="14" fill="#534AB7" />
              <circle
                cx="32"
                cy="32"
                r="18"
                fill="none"
                stroke="#EEEDFE"
                strokeWidth="2"
                opacity="0.4"
              />
              <text
                x="32"
                y="39"
                textAnchor="middle"
                fontFamily="system-ui"
                fontWeight="800"
                fontSize="20"
                fill="#FFFFFF"
              >
                FK
              </text>
            </svg>
            <span
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "#534AB7",
                letterSpacing: "-0.5px",
              }}
            >
              Finkoin
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            {centerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                scroll
                className="nav-underline transition-colors duration-300 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {fkBalance > 0 ? (
              <span className="hidden rounded-full bg-[#EEEDFE] px-3 py-1 text-xs font-semibold text-[#3C3489] md:inline-flex">
                🪙 {fkBalance} FK
              </span>
            ) : null}

            <Link
              href="/plans"
              scroll
              className="hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/35 md:inline-flex"
            >
              View Plans
            </Link>

            {!isLoggedIn ? (
              <Link
                href="/login"
                scroll
                className="hidden rounded-xl border border-[#E8E6F0] bg-white px-3.5 py-2 text-sm font-semibold text-[#534AB7] shadow-sm transition-colors hover:border-[#534AB7]/40 md:inline-flex"
              >
                Log in
              </Link>
            ) : null}

            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  router.push("/login");
                  return;
                }
                setProfileOpen((v) => !v);
              }}
              className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-[#E8E6F0] bg-[#F4F2FC] transition-transform duration-300 hover:scale-105"
              aria-label="Profile"
            >
              {!isLoggedIn ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#534AB7" strokeWidth="2" />
                  <path d="M4 20c1.2-3.3 4.3-5 8-5s6.8 1.7 8 5" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="inline-flex h-full w-full items-center justify-center bg-[#534AB7] text-sm font-bold text-white">
                  {avatarLetter}
                </span>
              )}
            </button>

            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {profileOpen && isLoggedIn ? (
          <>
            <motion.button
              key="profile-backdrop"
              type="button"
              aria-label="Close profile menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[998] bg-black/35 backdrop-blur-[1px]"
              onClick={() => setProfileOpen(false)}
            />
            <motion.div
              key="profile-panel"
              ref={profileMenuRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                maxHeight: "calc(100dvh - 4rem)",
                WebkitOverflowScrolling: "touch",
              }}
              className="fixed right-4 top-14 z-[1000] w-[min(320px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-[#F0EFF8] bg-white p-4 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
            >
            <div className="text-center">
              <div className="mx-auto mb-2 inline-flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-[#534AB7] text-lg font-bold text-white">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  avatarLetter
                )}
              </div>
              <p className="text-base font-bold text-slate-900">{user?.name ?? "Finkoin user"}</p>
              <p className="text-xs text-slate-500">{user?.phone ?? user?.email ?? "No contact added"}</p>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${subscriptionTier === "promax" ? "bg-slate-900 text-white" : subscriptionTier === "pro" ? "bg-[#EEEDFE] text-[#534AB7]" : "bg-slate-100 text-slate-700"}`}>
                {subscriptionTier === "free" ? "Free plan" : subscriptionTier === "pro" ? "Pro" : "Pro Max"}
              </span>
            </div>

            <div className="my-3 border-t border-[#F0EFF8]" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-sm font-bold text-slate-900">🪙 {fkBalance}</p>
                <p className="text-[10px] text-slate-500">tokens earned</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-sm font-bold text-slate-900">{badges}</p>
                <p className="text-[10px] text-slate-500">badges</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-sm font-bold text-slate-900">🔥 {streakDays}</p>
                <p className="text-[10px] text-slate-500">day streak</p>
              </div>
            </div>

            <div className="my-3 border-t border-[#F0EFF8]" />
            <nav className="space-y-1 text-sm">
              {[
                ["👤", "My Profile", "/profile"],
                ["📊", "My Analysis", "/analyse/result"],
                ["🛡️", "My Policies", "/policies"],
                ["🎯", "My Goals", "/goals"],
                ["📈", "My Investments", "/investments"],
                ["🏆", "Leaderboard", "/leaderboard"],
                ["🎁", "Rewards", "/rewards"],
                ["👥", "Refer & Earn", "/refer"],
                ["⚙️", "Settings", "/settings"],
              ].map(([icon, label, href]) => (
                <Link key={href} href={href} scroll onClick={() => setProfileOpen(false)} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-50">
                  <span>{icon} {label}</span>
                  <span>›</span>
                </Link>
              ))}
            </nav>

            <div className="my-3 border-t border-[#F0EFF8]" />
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-500">
              <Link href="/legal/privacy" scroll className="hover:text-[#534AB7]" onClick={() => setProfileOpen(false)}>
                Privacy
              </Link>
              <span aria-hidden className="text-slate-300">
                ·
              </span>
              <Link href="/legal/terms" scroll className="hover:text-[#534AB7]" onClick={() => setProfileOpen(false)}>
                Terms
              </Link>
              <span aria-hidden className="text-slate-300">
                ·
              </span>
              <Link href="/legal/refund" scroll className="hover:text-[#534AB7]" onClick={() => setProfileOpen(false)}>
                Refunds
              </Link>
              <span aria-hidden className="text-slate-300">
                ·
              </span>
              <Link
                href="/legal/disclaimer"
                scroll
                className="hover:text-[#534AB7]"
                onClick={() => setProfileOpen(false)}
              >
                Disclaimer
              </Link>
            </div>

            <div className="my-3 border-t border-[#F0EFF8]" />
            <button
              type="button"
              onClick={async () => {
                setProfileOpen(false);
                try {
                  await logoutAction();
                } catch (err) {
                  console.error("Sign out error:", err);
                } finally {
                  router.push("/");
                  router.refresh();
                }
              }}
              className="w-full text-center text-sm font-semibold text-red-600"
            >
              🚪 Sign out
            </button>
            <p className="mt-1 text-center text-[11px] text-slate-500">
              Signed in as {user?.phone ?? user?.email ?? "user"}
            </p>
          </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-white px-6 pt-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {fkBalance > 0 ? `🪙 ${fkBalance} FK earned` : "🪙 0 FK earned"}
              </p>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-5">
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  scroll
                  className="text-2xl font-semibold text-[#534AB7]"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
              ) : null}
              {[...centerNavItems, { href: "/plans", label: "Plans" }].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll
                  className="text-2xl font-semibold text-slate-900"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="absolute bottom-8 text-xs text-slate-400">
              Finkoin is educational and does not provide investment advice.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

