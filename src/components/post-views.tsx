"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./devblog.module.css";

type PostViewsProps = {
  postId: string;
};

const VIEW_STORAGE_PREFIX = "notlegal_viewed_post_";
const VIEW_COOLDOWN = 1000 * 60 * 60 * 24;

function formatViews(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

export default function PostViews({ postId }: PostViewsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [views, setViews] = useState(0);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    async function loadViews() {
      try {
        const response = await fetch(
          `/api/post-views?postId=${encodeURIComponent(postId)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (typeof data.views === "number") {
          setViews(data.views);
        }
      } catch {
        setViews(0);
      }
    }

    loadViews();
  }, [postId]);

  useEffect(() => {
    const element = rootRef.current;

    if (!element || counted) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) return;

        const storageKey = `${VIEW_STORAGE_PREFIX}${postId}`;
        const lastView = Number(localStorage.getItem(storageKey) || 0);
        const now = Date.now();

        if (now - lastView < VIEW_COOLDOWN) {
          setCounted(true);
          observer.disconnect();
          return;
        }

        try {
          const response = await fetch("/api/post-views", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ postId }),
          });

          if (!response.ok) return;

          const data = await response.json();

          if (typeof data.views === "number") {
            setViews(data.views);
            localStorage.setItem(storageKey, String(now));
          }
        } finally {
          setCounted(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.55,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [postId, counted]);

  return (
  <div ref={rootRef} className={styles.postViews}>
    <span>◉</span>

    <div>
      <b>{formatViews(views)}</b>
      <small>Просмотры</small>
    </div>
  </div>
);
}