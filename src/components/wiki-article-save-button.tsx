"use client";

import { useEffect, useState } from "react";
import styles from "./wiki-article-save-button.module.css";

type SavedPost = {
  title: string;
  href: string;
};

type WikiArticleSaveButtonProps = {
  title: string;
  href: string;
};

const STORAGE_KEY = "notlegal_saved_posts";

function normalizeSavedPosts(value: unknown): SavedPost[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is SavedPost =>
      Boolean(
        item &&
          typeof item === "object" &&
          "title" in item &&
          "href" in item &&
          typeof item.title === "string" &&
          typeof item.href === "string"
      )
  );
}

export default function WikiArticleSaveButton({
  title,
  href,
}: WikiArticleSaveButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function syncSavedState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const posts = normalizeSavedPosts(raw ? JSON.parse(raw) : []);
        setSaved(posts.some((post) => post.href === href));
      } catch {
        setSaved(false);
      }
    }

    syncSavedState();
    window.addEventListener("storage", syncSavedState);
    window.addEventListener("notlegal-saved-posts-change", syncSavedState);

    return () => {
      window.removeEventListener("storage", syncSavedState);
      window.removeEventListener("notlegal-saved-posts-change", syncSavedState);
    };
  }, [href]);

  function toggleSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const posts = normalizeSavedPosts(raw ? JSON.parse(raw) : []);
      const alreadySaved = posts.some((post) => post.href === href);
      const nextPosts = alreadySaved
        ? posts.filter((post) => post.href !== href)
        : [{ title, href }, ...posts];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
      setSaved(!alreadySaved);
      window.dispatchEvent(new Event("notlegal-saved-posts-change"));
    } catch {
      window.alert("Не удалось изменить сохранённые статьи.");
    }
  }

  return (
    <button
      aria-pressed={saved}
      className={`${styles.button} ${saved ? styles.buttonSaved : ""}`}
      onClick={toggleSaved}
      title={saved ? "Удалить из сохранённых" : "Добавить в сохранённые"}
      type="button"
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      <b>{saved ? "Сохранено" : "Сохранить"}</b>
    </button>
  );
}
