"use client";

import { useEffect, useState } from "react";
import styles from "@/app/wiki/wiki.module.css";

type SavedPost = {
  title: string;
  href: string;
};

const STORAGE_KEY = "notlegal_saved_posts";

type SavePostButtonProps = {
  title: string;
  href: string;
};

export default function SavePostButton({ title, href }: SavePostButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const posts: SavedPost[] = raw ? JSON.parse(raw) : [];

      setSaved(posts.some((post) => post.href === href));
    } catch {
      setSaved(false);
    }
  }, [href]);

  function toggleSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const posts: SavedPost[] = raw ? JSON.parse(raw) : [];

      const exists = posts.some((post) => post.href === href);

      const nextPosts = exists
        ? posts.filter((post) => post.href !== href)
        : [{ title, href }, ...posts];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));

      setSaved(!exists);

      window.dispatchEvent(new Event("notlegal-saved-posts-change"));
    } catch {
      alert("Не удалось сохранить статью");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleSave}
      className={`${styles.savePostButton} ${saved ? styles.savePostButtonActive : ""}`}
    >
      {saved ? "★ Сохранено" : "☆ Сохранить"}
    </button>
  );
}