import { Suspense } from "react";
import JoinSplitGroupClient from "./JoinSplitGroupClient";

export const dynamic = "force-dynamic";

function JoinFallback() {
  return (
    <div className="min-h-dvh bg-[#F7F7F4] px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#E8E6F0] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEEDFE] text-2xl">
          ⏳
        </div>
        <div className="text-base font-bold text-[#111110]">Loading…</div>
      </div>
    </div>
  );
}

export default function JoinSplitGroupPage() {
  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinSplitGroupClient />
    </Suspense>
  );
}
