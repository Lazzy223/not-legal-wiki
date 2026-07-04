"use client";

import { useEffect, useState } from "react";
import styles from "./article-view-tracker.module.css";

type ArticleViewTrackerProps = {
  articleId: string;
};

const VIEW_COOLDOWN = 1000 * 60 * 60 * 24;

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

  useEffect(() => {
    let cancelled = false;

    async function trackView() {
      try {
        const storageKey = `notlegal_viewed_${postId}`;
        const lastView = Number(localStorage.getItem(storageKey) || 0);
        const now = Date.now();
        const shouldIncrement = now - lastView >= VIEW_COOLDOWN;
        const response = await fetch(
          shouldIncrement
            ? "/api/post-views"
            : `/api/post-views?postId=${encodeURIComponent(postId)}`,
          shouldIncrement
            ? {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId }),
              }
            : { cache: "no-store" }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled && typeof data.views === "number") {
          setViews(data.views);
        }

        if (shouldIncrement) {
          localStorage.setItem(storageKey, String(now));
        }
      } catch {
        if (!cancelled) {
          setViews(0);
        }
      }
    }

    trackView();

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
