"use client";

import { useEffect } from "react";
import { useGamificationStore } from "@/store/gamificationStore";

export function ArticleTracker({ articleId }: { articleId: string }) {
  const earnTokens = useGamificationStore((s) => s.earnTokens);
  const hasEarnedAction = useGamificationStore((s) => s.hasEarnedAction);
  const markEarnedAction = useGamificationStore((s) => s.markEarnedAction);

  useEffect(() => {
    const key = `article:${articleId}`;
    if (hasEarnedAction(key)) return;
    earnTokens(10, "Read finance article");
    markEarnedAction(key);
  }, [articleId, earnTokens, hasEarnedAction, markEarnedAction]);

  return null;
}

