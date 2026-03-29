"use client";

import { ShareButton } from "@/components/learn/share-button";
import { useEffect, useState } from "react";

export function ArticleShare({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return <ShareButton title={title} url={url || path} />;
}
