"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type LaunchParamsLike = { targetURL?: string };
type LaunchQueueLike = {
  setConsumer: (cb: (params: LaunchParamsLike) => void) => void;
};

/**
 * When Android opens an already-running PWA for an in-scope link
 * (launch_handler / link capturing), navigate to the launch URL.
 */
export function PwaLaunchHandler() {
  const router = useRouter();

  useEffect(() => {
    const w = window as Window & { launchQueue?: LaunchQueueLike };
    if (!w.launchQueue?.setConsumer) return;

    w.launchQueue.setConsumer((launchParams) => {
      const target = launchParams.targetURL;
      if (!target) return;
      try {
        const url = new URL(target);
        if (url.origin !== window.location.origin) return;
        const next = `${url.pathname}${url.search}${url.hash}`;
        if (!next.startsWith("/")) return;
        router.replace(next);
      } catch {
        // ignore malformed launch URLs
      }
    });
  }, [router]);

  return null;
}
