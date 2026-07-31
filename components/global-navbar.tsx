"use client";

import NotificationBell from "@/components/NotificationBell";
import FeedbackFormButton from "@/components/FeedbackFormButton";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { fadeIn } from "@/lib/animations";
import { loginHrefPreserveRef } from "@/lib/referralRewards";
import { trackNavClick } from "@/lib/gtag";
import { useAuthStore } from "@/store/authStore";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGamificationStore } from "@/store/gamificationStore";
import { usePathname } from "next/navigation";

const centerNavItems = [
  { href: "/analyse", label: "Analyse" },
  { href: "/tracker", label: "Tracker" },
  { href: "/split", label: "FK Split" },
  { href: "/calculators", label: "Calculators" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/learn", label: "Learn" },
] as const;

export function GlobalNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const fkBalance = useGamificationStore((s) => s.fkBalance);
  const badges = useGamificationStore((s) => s.badges.length);
  const streakDays = useGamificationStore((s) => s.streakDays);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const [authUiReady, setAuthUiReady] = useState(false);
  /**
   * After mount + persist bootstrap, show real auth chrome.
   * Until then keep a neutral skeleton so SSR HTML matches hydration.
   */
  const showAsLoggedIn = authUiReady && isLoggedIn && Boolean(user);
  const showLoginCta = authUiReady && hasInitialized && !isLoggedIn;
  const authChromePending = !authUiReady || (!hasInitialized && !isLoggedIn);
  const subscriptionTier = useAuthStore(
    (s) => s.user?.subscriptionTier ?? "free",
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /** Mobile bottom nav: slightly compact while away from top (always visible). */
  const [bottomNavCompact, setBottomNavCompact] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setAuthUiReady(true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const zoneEl = t.closest("[data-track-nav-zone]");
      if (!zoneEl) return;
      const zone = zoneEl.getAttribute("data-track-nav-zone") ?? "unknown";

      const internal = t.closest("[data-internal-href]");
      if (internal && zoneEl.contains(internal)) {
        const href = internal.getAttribute("data-internal-href");
        if (href) trackNavClick(href, zone);
        return;
      }

      const a = t.closest("a[href]");
      if (a && zoneEl.contains(a)) {
        const href = a.getAttribute("href") ?? "";
        if (!href || href.startsWith("#")) return;
        trackNavClick(href, zone);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setBottomNavCompact(y >= 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
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

  const handleSignOut = useCallback(async () => {
    try {
      setProfileOpen(false);
      await useAuthStore.getState().logout();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      useAuthStore.setState({
        user: null,
        isLoggedIn: false,
        userId: null,
        subscriptionTier: "free",
      });
      router.push("/");
      router.refresh();
    }
  }, [router]);

  return (
    <>
      <m.header
        data-track-nav-zone="header_bar"
        variants={fadeIn}
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative sticky top-0 z-50 w-full"
        style={{ paddingTop: "max(4px, env(safe-area-inset-top))" }}
      >
        {/* Soft wash only — no border, shadow, or hard bottom edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[88px] transition-opacity duration-300"
          style={{
            background: scrolled
              ? "linear-gradient(180deg, rgba(244,242,252,0.96) 0%, rgba(244,242,252,0.72) 48%, rgba(244,242,252,0) 100%)"
              : "linear-gradient(180deg, rgba(244,242,252,0.55) 0%, rgba(244,242,252,0.18) 50%, rgba(244,242,252,0) 100%)",
            WebkitBackdropFilter: "blur(14px) saturate(1.3)",
            backdropFilter: "blur(14px) saturate(1.3)",
            maskImage:
              "linear-gradient(180deg, #000 0%, #000 58%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, #000 0%, #000 58%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6">
          <Link
            href="/"
            scroll
            className="flex min-w-0 items-center gap-2 sm:gap-2.5"
            aria-label="Finkoin home"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 64 64"
              role="img"
              aria-label="Finkoin logo"
              className="shrink-0"
            >
              <rect width="64" height="64" rx="18" fill="#534AB7" />
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
            <span className="truncate text-[18px] font-bold tracking-[-0.5px] text-[#534AB7] sm:text-[20px]">
              Finkoin
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#3D3A5C] lg:flex">
            {centerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                scroll
                className="nav-underline transition-colors duration-300 hover:text-[#534AB7]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {showAsLoggedIn ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#3C3489] shadow-sm ring-1 ring-[#534AB7]/10 md:inline-flex">
                <AppIcon name="coin" size={14} color="#534AB7" />
                {fkBalance} FK
              </span>
            ) : null}

            <Link
              href="/plans"
              scroll
              className="hidden rounded-full bg-[#534AB7] px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(83,74,183,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(83,74,183,0.45)] md:inline-flex"
            >
              View Plans
            </Link>

            {showAsLoggedIn ? <NotificationBell /> : null}

            {showLoginCta ? (
              <Link
                href={loginHrefPreserveRef("/login")}
                scroll
                className="hidden rounded-full border border-white/80 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-[#534AB7] shadow-sm transition-colors hover:bg-white md:inline-flex"
              >
                Log in
              </Link>
            ) : null}

            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => {
                if (authChromePending) return;
                if (!showAsLoggedIn) {
                  router.push(loginHrefPreserveRef("/login"));
                  return;
                }
                setProfileOpen((v) => !v);
              }}
              className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/75 shadow-sm transition-transform duration-300 hover:scale-105"
              aria-label="Profile"
            >
              {authChromePending ? (
                <span
                  className="h-full w-full animate-pulse bg-[#E8E6F0]"
                  aria-hidden
                />
              ) : !showAsLoggedIn ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="#534AB7"
                    strokeWidth="2"
                  />
                  <path
                    d="M4 20c1.2-3.3 4.3-5 8-5s6.8 1.7 8 5"
                    stroke="#534AB7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="inline-flex h-full w-full items-center justify-center bg-[#534AB7] text-sm font-bold text-white">
                  {avatarLetter}
                </span>
              )}
            </button>
          </div>
        </div>
      </m.header>

      <AnimatePresence>
        {profileOpen && showAsLoggedIn ? (
          <>
            <m.button
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
            <m.div
              key="profile-panel"
              data-track-nav-zone="profile_menu"
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
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    avatarLetter
                  )}
                </div>
                <p className="text-base font-bold text-slate-900">
                  {user?.name ?? "Finkoin user"}
                </p>
                <p className="text-xs text-slate-600">
                  {user?.phone ?? user?.email ?? "No contact added"}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${subscriptionTier === "promax" ? "bg-slate-900 text-white" : subscriptionTier === "pro" ? "bg-[#EEEDFE] text-[#534AB7]" : "bg-slate-100 text-slate-700"}`}
                >
                  {subscriptionTier === "free"
                    ? "Free plan"
                    : subscriptionTier === "pro"
                      ? "Pro"
                      : "Pro Max"}
                </span>
              </div>

              <div className="my-3 border-t border-[#F0EFF8]" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-900">
                    <AppIcon name="coin" size={15} color="#534AB7" />
                    {fkBalance}
                  </p>
                  <p className="text-[10px] text-slate-600">tokens earned</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-sm font-bold text-slate-900">{badges}</p>
                  <p className="text-[10px] text-slate-600">badges</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-900">
                    <AppIcon name="flame" size={15} color="#534AB7" />
                    {streakDays}
                  </p>
                  <p className="text-[10px] text-slate-600">day streak</p>
                </div>
              </div>

              <div className="my-3 border-t border-[#F0EFF8]" />
              <nav className="space-y-1 text-sm">
                {(
                  [
                    ["user", "My Profile", "/profile"],
                    ["notebook", "Expense Tracker", "/tracker"],
                    ["users", "FK Split", "/split"],
                    ["chart", "My Analysis", "/analyse/result"],
                    ["shield", "My Policies", "/policies"],
                    ["target", "My Goals", "/goals"],
                    ["trending", "My Investments", "/investments"],
                    ["trophy", "Leaderboard", "/leaderboard"],
                    ["gift", "Rewards", "/rewards"],
                    ["users", "Refer & Earn", "/refer"],
                    ["settings", "Settings", "/settings"],
                  ] as [AppIconName, string, string][]
                ).map(([icon, label, href]) => (
                  <button
                    key={label}
                    type="button"
                    data-internal-href={href}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push(href);
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <AppIcon name={icon} size={17} color="#534AB7" />
                      {label}
                    </span>
                    <span aria-hidden>›</span>
                  </button>
                ))}
              </nav>

              <div className="my-3 border-t border-[#F0EFF8]" />
              <div className="px-1">
                <FeedbackFormButton />
              </div>

              <div className="my-3 border-t border-[#F0EFF8]" />
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-600">
                <Link
                  href="/legal/privacy"
                  scroll
                  className="hover:text-[#534AB7]"
                  onClick={() => setProfileOpen(false)}
                >
                  Privacy
                </Link>
                <span aria-hidden className="text-slate-300">
                  ·
                </span>
                <Link
                  href="/legal/terms"
                  scroll
                  className="hover:text-[#534AB7]"
                  onClick={() => setProfileOpen(false)}
                >
                  Terms
                </Link>
                <span aria-hidden className="text-slate-300">
                  ·
                </span>
                <Link
                  href="/legal/refund"
                  scroll
                  className="hover:text-[#534AB7]"
                  onClick={() => setProfileOpen(false)}
                >
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
                onClick={() => void handleSignOut()}
                className="flex w-full items-center justify-center gap-2 text-center text-sm font-semibold text-red-600"
              >
                <AppIcon name="logout" size={16} color="currentColor" />
                Sign out
              </button>
              <p className="mt-1 text-center text-[11px] text-slate-600">
                Signed in as {user?.phone ?? user?.email ?? "user"}
              </p>
            </m.div>
          </>
        ) : null}
      </AnimatePresence>

      <nav
        aria-label="Mobile quick navigation"
        data-track-nav-zone="bottom_nav"
        data-nav-compact={bottomNavCompact ? "true" : "false"}
        className="pointer-events-none fixed inset-x-0 z-[55] overflow-visible px-3 md:hidden"
        style={{
          bottom: "max(10px, env(safe-area-inset-bottom))",
        }}
      >
        {/* Top padding so the raised Track button is never clipped */}
        <div
          className={`pointer-events-auto relative mx-auto max-w-md origin-bottom overflow-visible transition-transform duration-300 ease-out ${
            bottomNavCompact ? "scale-[0.96] pt-4" : "scale-100 pt-5"
          }`}
        >
          <div
            className="relative rounded-[28px] border border-white/70"
            style={{
              background: [
                "radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 55%)",
                "radial-gradient(90% 60% at 50% 120%, rgba(83,74,183,0.22) 0%, rgba(83,74,183,0) 55%)",
                "linear-gradient(165deg, rgba(255,255,255,0.55) 0%, rgba(232,230,248,0.42) 42%, rgba(196,190,240,0.48) 100%)",
              ].join(", "),
              WebkitBackdropFilter: "blur(28px) saturate(1.85)",
              backdropFilter: "blur(28px) saturate(1.85)",
              boxShadow: [
                "0 12px 40px rgba(60, 50, 120, 0.28)",
                "0 2px 10px rgba(83,74,183,0.16)",
                "inset 0 1.5px 0 rgba(255,255,255,0.9)",
                "inset 0 -10px 18px rgba(83,74,183,0.12)",
                "inset 0 0 0 1px rgba(255,255,255,0.35)",
              ].join(", "),
            }}
          >
            <div
              className={`grid grid-cols-5 items-end gap-0.5 px-1.5 ${
                bottomNavCompact ? "pb-1 pt-1" : "pb-1.5 pt-1.5"
              }`}
            >
              <Link
                href="/"
                scroll
                aria-current={currentPath === "/" ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pb-1 pt-0.5 ${currentPath === "/" ? "text-[#534AB7]" : "text-[#3D3A5C]"}`}
              >
                <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-6 [&>svg]:w-6">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span
                  className={`text-[11px] leading-none ${currentPath === "/" ? "font-semibold" : "font-medium"}`}
                >
                  Home
                </span>
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${currentPath === "/" ? "bg-[#534AB7]" : "bg-transparent"}`}
                  aria-hidden
                />
              </Link>

              <Link
                href="/analyse"
                scroll
                aria-current={
                  currentPath === "/analyse" ||
                  currentPath.startsWith("/analyse/")
                    ? "page"
                    : undefined
                }
                className={`flex flex-col items-center gap-0.5 pb-1 pt-0.5 ${
                  currentPath === "/analyse" ||
                  currentPath.startsWith("/analyse/")
                    ? "text-[#534AB7]"
                    : "text-[#3D3A5C]"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-6 [&>svg]:w-6">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2v6h6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    currentPath === "/analyse" ||
                    currentPath.startsWith("/analyse/")
                      ? "font-semibold"
                      : "font-medium"
                  }`}
                >
                  Report
                </span>
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${
                    currentPath === "/analyse" ||
                    currentPath.startsWith("/analyse/")
                      ? "bg-[#534AB7]"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </Link>

              <Link
                href="/tracker"
                scroll
                aria-current={
                  currentPath === "/tracker" ||
                  currentPath.startsWith("/tracker/")
                    ? "page"
                    : undefined
                }
                className={`relative flex w-full flex-col items-center justify-end gap-0.5 outline-none transition-all duration-300 ${
                  bottomNavCompact
                    ? "min-h-[48px] pb-0.5 pt-0"
                    : "min-h-[52px] pb-1 pt-0"
                }`}
              >
                <span
                  className={`relative z-20 mb-0.5 flex shrink-0 items-center justify-center rounded-full bg-white p-[3px] shadow-[0_4px_14px_rgba(83,74,183,0.28)] ring-1 ring-[#E8E6F0] transition-all duration-300 ${
                    bottomNavCompact ? "-mt-7 h-11 w-11" : "-mt-8 h-12 w-12"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full bg-[#534AB7] font-light leading-none text-white shadow-[0_4px_16px_rgba(83,74,183,0.4)] transition-all duration-300 ${
                      bottomNavCompact
                        ? "h-9 w-9 text-[22px]"
                        : "h-10 w-10 text-[26px]"
                    }`}
                  >
                    +
                  </span>
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    currentPath === "/tracker" ||
                    currentPath.startsWith("/tracker/")
                      ? "font-semibold text-[#534AB7]"
                      : "font-medium text-[#3D3A5C]"
                  }`}
                >
                  Track
                </span>
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${
                    currentPath === "/tracker" ||
                    currentPath.startsWith("/tracker/")
                      ? "bg-[#534AB7]"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </Link>

              <Link
                href="/calculators"
                scroll
                aria-current={
                  currentPath === "/calculators" ||
                  currentPath === "/calculator" ||
                  currentPath.startsWith("/calculators/")
                    ? "page"
                    : undefined
                }
                className={`flex flex-col items-center gap-0.5 pb-1 pt-0.5 ${
                  currentPath === "/calculators" ||
                  currentPath === "/calculator" ||
                  currentPath.startsWith("/calculators/")
                    ? "text-[#534AB7]"
                    : "text-[#3D3A5C]"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-6 [&>svg]:w-6">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect
                      x="4"
                      y="3"
                      width="16"
                      height="18"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 8h8M8 12h8M8 16h5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    currentPath === "/calculators" ||
                    currentPath === "/calculator" ||
                    currentPath.startsWith("/calculators/")
                      ? "font-semibold"
                      : "font-medium"
                  }`}
                >
                  Calculators
                </span>
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${
                    currentPath === "/calculators" ||
                    currentPath === "/calculator" ||
                    currentPath.startsWith("/calculators/")
                      ? "bg-[#534AB7]"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </Link>

              <Link
                href="/profile"
                scroll
                aria-current={
                  currentPath === "/profile" ||
                  currentPath.startsWith("/profile/")
                    ? "page"
                    : undefined
                }
                className={`flex flex-col items-center gap-0.5 pb-1 pt-0.5 ${
                  currentPath === "/profile" ||
                  currentPath.startsWith("/profile/")
                    ? "text-[#534AB7]"
                    : "text-[#3D3A5C]"
                }`}
              >
                <span className="relative inline-flex h-7 w-7 items-center justify-center">
                  {authChromePending ? (
                    <span
                      className="h-7 w-7 animate-pulse rounded-full border border-[#E8E6F0] bg-[#E8E6F0]"
                      aria-hidden
                    />
                  ) : !showAsLoggedIn ? (
                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[#E8E6F0] bg-[#F4F2FC]">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <circle
                          cx="12"
                          cy="8"
                          r="4"
                          stroke="#534AB7"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M4 20c1.2-3.3 4.3-5 8-5s6.8 1.7 8 5"
                          stroke="#534AB7"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  ) : user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt=""
                      className="h-7 w-7 rounded-full border border-[#E8E6F0] object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E8E6F0] bg-[#534AB7] text-xs font-bold text-white">
                      {avatarLetter}
                    </span>
                  )}
                  {showAsLoggedIn ? (
                    <span className="absolute -right-1 -top-0.5 min-h-[16px] min-w-[16px] rounded bg-[#534AB7] px-1 text-[9px] font-bold leading-[14px] text-white">
                      {fkBalance > 999 ? "999+" : fkBalance}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    currentPath === "/profile" ||
                    currentPath.startsWith("/profile/")
                      ? "font-semibold"
                      : "font-medium"
                  }`}
                >
                  Profile
                </span>
                <span
                  className={`h-1 w-1 shrink-0 rounded-full ${
                    currentPath === "/profile" ||
                    currentPath.startsWith("/profile/")
                      ? "bg-[#534AB7]"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        source="navbar"
      />
    </>
  );
}
