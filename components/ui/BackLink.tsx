"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Back control for page flows. Prefer browser history when available,
 * otherwise fall back to a known path so deep links never strand the user.
 */
export default function BackLink({
  fallbackHref = "/",
  label = "Back",
  className = "",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={`inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#534AB7] ${className}`}
      aria-label={label}
    >
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE] text-base font-bold leading-none"
        aria-hidden
      >
        ←
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Static link variant when history back is not desired. */
export function BackHref({
  href,
  label = "Back",
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#534AB7] ${className}`}
    >
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE] text-base font-bold leading-none"
        aria-hidden
      >
        ←
      </span>
      <span>{label}</span>
    </Link>
  );
}
