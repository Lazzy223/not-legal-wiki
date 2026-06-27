"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/app/wiki/wiki.module.css";

type AuthUser = {
  login?: string;
  username?: string;
  role?: string;
  roleName?: string;
  canOpenAdmin?: boolean;
};

type SavedPost = {
  title: string;
  href: string;
};

const STORAGE_KEY = "notlegal_saved_posts";

export default function WikiTopActions() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        setUser(data.user || null);
      } catch {
        setUser(null);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    function loadSavedPosts() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (Array.isArray(parsed)) {
          setSavedPosts(parsed);
        }
      } catch {
        setSavedPosts([]);
      }
    }

    loadSavedPosts();

    window.addEventListener("storage", loadSavedPosts);
    window.addEventListener("notlegal-saved-posts-change", loadSavedPosts);

    return () => {
      window.removeEventListener("storage", loadSavedPosts);
      window.removeEventListener("notlegal-saved-posts-change", loadSavedPosts);
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSavedOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function updateSavedPosts(nextPosts: SavedPost[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosts));
    setSavedPosts(nextPosts);
    window.dispatchEvent(new Event("notlegal-saved-posts-change"));
  }

  function removeSavedPost(href: string) {
    const nextPosts = savedPosts.filter((post) => post.href !== href);
    updateSavedPosts(nextPosts);
  }

  function clearSavedPosts() {
    updateSavedPosts([]);
  }

  return (
    <>
      <div className={styles.headerActions}>
        <div className={styles.savedBox}>
          <button
            type="button"
            className={styles.savedButton}
            onClick={() => setIsSavedOpen((current) => !current)}
            title="Сохранённые посты"
          >
            ☆
            {savedPosts.length > 0 && <span>{savedPosts.length}</span>}
          </button>
        </div>

        {user?.canOpenAdmin && (
          <Link href="/admin" className={styles.adminAccessButton}>
            Админ-панель
          </Link>
        )}
      </div>

      {mounted &&
        isSavedOpen &&
        createPortal(
          <div className={styles.savedPortal}>
            <button
              type="button"
              className={styles.savedPortalOverlay}
              onClick={() => setIsSavedOpen(false)}
              aria-label="Закрыть сохранённые посты"
            />

            <div className={styles.savedDropdown}>
              <div className={styles.savedHead}>
                <strong>Сохранённые посты</strong>

                <div className={styles.savedHeadActions}>
                  <span>{savedPosts.length}</span>

                  {savedPosts.length > 0 && (
                    <button type="button" onClick={clearSavedPosts}>
                      Очистить
                    </button>
                  )}
                </div>
              </div>

              {savedPosts.length > 0 ? (
                <div className={styles.savedList}>
                  {savedPosts.map((post) => (
                    <div className={styles.savedItem} key={post.href}>
                      <Link
                        href={post.href}
                        onClick={() => {
                          setIsSavedOpen(false);
                        }}
                      >
                        {post.title}
                      </Link>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          removeSavedPost(post.href);
                        }}
                        title="Удалить из сохранённых"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.savedEmpty}>
                  Сохранённых постов пока нет.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}