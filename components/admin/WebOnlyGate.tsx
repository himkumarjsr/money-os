"use client";

import { type ReactNode, useEffect, useState } from "react";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { isStandalonePwa } from "@/lib/pwaLaunch";

/** The admin console is for the website only, not the installed PWA. */
export function WebOnlyGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"checking" | "web" | "app">("checking");

  useEffect(() => {
    setMode(isStandalonePwa() ? "app" : "web");
  }, []);

  if (mode === "checking") {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  if (mode === "app") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-[#111110]">
          Open this on the web
        </h1>
        <p className="mt-2 text-sm text-[#5F5E5A]">
          The admin console is only available in a browser at finkoin.com, not
          in the installed app.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
