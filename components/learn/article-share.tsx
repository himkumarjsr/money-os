"use client";

import { ShareButton } from "@/components/ui/ShareButton";

export function ArticleShare({ title, path }: { title: string; path: string }) {
  return (
    <ShareButton
      title={title}
      path={path}
      contentType="learn_article"
      contentId={path}
    />
  );
}
