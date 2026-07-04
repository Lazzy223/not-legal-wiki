"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./article-view-tracker.module.css";

type ArticleViewTrackerProps = {
  articleId: string;
};

function formatViews(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

export default function ArticleViewTracker({
  articleId,
}: ArticleViewTrackerProps) {
  const postId = `wiki:${articleId}`;
  const [views, setViews] = useState(0);
  const trackedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (trackedRef.current) {
      return;
    }

    trackedRef.current = true;

    async function trackView() {
      try {
        const response = await fetch("/api/post-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
          cache: "no-store",
          keepalive: true,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled && typeof data.views === "number") {
          setViews(data.views);
        }
      } catch {
        if (!cancelled) {
          setViews(0);
        }
      }
    }

    void trackView();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <span className={styles.views} title="Просмотры статьи">
      <i>◉</i>
      {formatViews(views)}
    </span>
  );
}
