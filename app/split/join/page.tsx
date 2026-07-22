import { Suspense } from "react";
import JoinSplitGroupClient from "./JoinSplitGroupClient";
import BrandPageLoader from "@/components/ui/BrandPageLoader";

export const dynamic = "force-dynamic";

export default function JoinSplitGroupPage() {
  return (
    <Suspense
      fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
    >
      <JoinSplitGroupClient />
    </Suspense>
  );
}
