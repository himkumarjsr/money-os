"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper: Next 15 disallows `next/dynamic` with `ssr: false`
 * inside Server Components (the root layout), so the lazy import lives here.
 */
const RenewalReminderBannerLazy = dynamic(
  () =>
    import("@/components/RenewalReminderBanner").then((m) => ({
      default: m.RenewalReminderBanner,
    })),
  { ssr: false },
);

export default RenewalReminderBannerLazy;
