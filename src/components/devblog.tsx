"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import DevBlogPostCard from "@/components/devblog-post-card";
import PostViews from "@/components/post-views";
import type { ChangelogPost } from "@/lib/changelog-store";
import styles from "./devblog.module.css";

type DevBlogProps = {
  posts: ChangelogPost[];
  showAdminButton?: boolean;
};

type SavedPost = {
  title: string;
  href: string;
};

type SearchSuggestion = {
  id: string;
  title: string;
  href: string;
  date: string;
  snippet: string;
};

type ChangelogPostWithDescription = ChangelogPost & {
  description?: string;
};

const SAVED_KEY = "notlegal_saved_posts";

const monthNames = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

function getMonthKey(value: string) {
  const [datePart] = value.split("T");
  const [year, month] = datePart.split("-");

  if (!year || !month) {
    return "unknown";
  }

  return `${year}-${month}`;
}

function getMonthTitle(key: string) {
  if (key === "unknown") {
    return "Без даты";
  }

  const [year, month] = key.split("-");
  const monthIndex = Number(month) - 1;

  return `${monthNames[monthIndex] || month} ${year}`;
}

function stripHtml(value = "") {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(li|p|div|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getPostSearchText(post: ChangelogPostWithDescription) {
  return [
    post.title,
    post.description,
    post.publishedAt,
    ...(post.updates || []),
    ...(post.fixes || []),
    stripHtml(post.updatesHtml),
    stripHtml(post.fixesHtml),
  ]
    .filter(Boolean)
    .join(" ");
}

function getSuggestionSnippet(text: string, query: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const cleanQuery = query.trim().toLowerCase();

  if (!cleanText || !cleanQuery) {
    return "";
  }

  const index = cleanText.toLowerCase().indexOf(cleanQuery);

  if (index === -1) {
    return cleanText.slice(0, 120);
  }

  const start = Math.max(0, index - 45);
  const end = Math.min(cleanText.length, index + cleanQuery.length + 75);

  return `${start > 0 ? "..." : ""}${cleanText.slice(start, end)}${
    end < cleanText.length ? "..." : ""
  }`;
}

function formatSuggestionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Без даты";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function DevBlog({ posts, showAdminButton = false }: DevBlogProps) {
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function loadSaved() {
      try {
        const raw = localStorage.getItem(SAVED_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (Array.isArray(parsed)) {
          setSavedPosts(parsed);
        }
      } catch {
        setSavedPosts([]);
      }
    }

    loadSaved();

    window.addEventListener("storage", loadSaved);
    window.addEventListener("notlegal-saved-posts-change", loadSaved);

    return () => {
      window.removeEventListener("storage", loadSaved);
      window.removeEventListener("notlegal-saved-posts-change", loadSaved);
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSavedOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return posts
      .map((post) => {
        const typedPost = post as ChangelogPostWithDescription;
        const searchText = getPostSearchText(typedPost);
        const lowerText = searchText.toLowerCase();

        if (!lowerText.includes(query)) {
          return null;
        }

        return {
          id: post.id,
          title: post.title,
          href: `/wiki/changelog#${encodeURIComponent(post.id)}`,
          date: formatSuggestionDate(post.publishedAt),
          snippet: getSuggestionSnippet(searchText, search),
        };
      })
      .filter(Boolean)
      .slice(0, 7) as SearchSuggestion[];
  }, [posts, search]);

  const groups = useMemo(() => {
    const map = new Map<string, ChangelogPost[]>();

    posts.forEach((post) => {
      const key = getMonthKey(post.publishedAt);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(post);
    });

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      title: getMonthTitle(key),
      items,
    }));
  }, [posts]);

  function updateSavedPosts(nextPosts: SavedPost[]) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(nextPosts));
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

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
          <span>NOT LEGAL</span>
          <b>RP</b>
        </Link>

        <nav className={styles.nav}>
          <Link href="/wiki">Wiki</Link>
          <Link href="/wiki/changelog" className={styles.activeLink}>
            Dev Blog
          </Link>
          <Link href="/wiki/rules">Rules</Link>
          <button type="button">Forum</button>
        </nav>

        <div className={styles.topActions}>
          <div className={styles.savedBox}>
            <button
              type="button"
              className={styles.savedButton}
              onClick={() => setSavedOpen((current) => !current)}
              title="Сохранённые посты"
            >
              ☆
              {savedPosts.length > 0 && <span>{savedPosts.length}</span>}
            </button>
          </div>

          {showAdminButton && (
            <Link href="/admin/changelog" className={styles.adminLink}>
              Панель администратора
              <span>⌄</span>
            </Link>
          )}
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>DEV BLOG</h1>
          <span />
          <p>
            Последние обновления, исправления и новости разработки проекта
            Not Legal RP.
          </p>
        </div>
      </section>

      <section className={styles.tools}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  setSearchFocused(false);
                }, 120);
              }}
              placeholder="Поиск по записям..."
            />

            {search ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSearch("")}
                className={styles.clearSearch}
              >
                ×
              </button>
            ) : (
              <b>☷</b>
            )}
          </div>

          {searchFocused && search.trim() && searchSuggestions.length > 0 && (
            <div className={styles.searchDropdown}>
              <div className={styles.searchDropdownHead}>
                <span>Подходящие записи</span>
                <b>{searchSuggestions.length}</b>
              </div>

              {searchSuggestions.map((item) => (
                <Link
                  href={item.href}
                  className={styles.searchSuggestion}
                  key={item.id}
                  onClick={() => {
                    setSearchFocused(false);
                  }}
                >
                  <strong>{item.title}</strong>
                  <p>{item.snippet}</p>
                  <small>{item.date}</small>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.totalInfo}>
          <span>▤</span>
          Всего записей: <b>{posts.length}</b>
        </div>
      </section>

      <section className={styles.timeline}>
        {groups.map((group) => (
          <div className={styles.monthGroup} key={group.key}>
            <div className={styles.monthTitle}>{group.title}</div>

            <div className={styles.monthLine}>
              <span />
            </div>

            <div className={styles.posts}>
              {group.items.map((post) => (
                <div id={post.id} className={styles.postAnchor} key={post.id}>
                  <PostViews postId={post.id} />

                  <DevBlogPostCard post={post} searchQuery={search} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <button
        type="button"
        onClick={scrollToTop}
        className={styles.upButton}
        aria-label="Вернуться наверх"
      >
        ↑
      </button>

      {mounted &&
        savedOpen &&
        createPortal(
          <div className={styles.savedPortal}>
            <button
              type="button"
              className={styles.savedPortalOverlay}
              onClick={() => setSavedOpen(false)}
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
                          setSavedOpen(false);
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
                <p className={styles.savedEmpty}>Сохранённых постов пока нет.</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}
