"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./wiki-article-navigation.module.css";

export type WikiNavigationArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  href: string;
};

type WikiArticleNavigationProps = {
  articles: WikiNavigationArticle[];
  currentSlug: string;
};

type SavedPost = {
  title: string;
  href: string;
};

const DESKTOP_PANEL_WIDTH = "352px";
const SAVED_POSTS_KEY = "notlegal_saved_posts";

const categoryNames: Record<string, string> = {
  start: "Быстрый старт",
  guides: "Основы проекта",
  phone: "Телефон",
  jobs: "Работы",
  factions: "Фракции",
  government: "Государство",
  crime: "Криминал",
  systems: "Системы",
  general: "Прочее",
  changelog: "Changelog",
};

const categoryIcons: Record<string, string> = {
  start: "↗",
  guides: "◇",
  phone: "▯",
  jobs: "$",
  factions: "♜",
  government: "⌂",
  crime: "☠",
  systems: "⚙",
  general: "□",
  changelog: "▤",
};

function categoryLabel(category: string) {
  return categoryNames[category] || category;
}

function normalizeHref(value: string) {
  return value.split("#")[0].replace(/\/$/, "");
}

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

export default function WikiArticleNavigation({
  articles,
  currentSlug,
}: WikiArticleNavigationProps) {
  const currentArticle = articles.find((article) => article.slug === currentSlug);
  const currentCategory = currentArticle?.category || articles[0]?.category || "general";
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedExpanded, setSavedExpanded] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [currentCategory]: true,
  });

  const groupedArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const groups = new Map<string, WikiNavigationArticle[]>();

    for (const article of articles) {
      const searchable = `${article.title} ${article.category} ${article.description}`.toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        continue;
      }

      const group = groups.get(article.category) || [];
      group.push(article);
      groups.set(article.category, group);
    }

    return Array.from(groups.entries());
  }, [articles, query]);

  const savedArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const savedHrefs = new Set(savedPosts.map((post) => normalizeHref(post.href)));

    return articles.filter((article) => {
      const articleHref = normalizeHref(`/wiki/${article.slug}`);
      const navigationHref = normalizeHref(article.href);
      const isSaved = savedHrefs.has(articleHref) || savedHrefs.has(navigationHref);

      if (!isSaved) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${article.title} ${article.category} ${article.description}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [articles, query, savedPosts]);

  const savedSectionExpanded = query.trim() ? true : savedExpanded;

  function openNavigation() {
    setOpen(true);
  }

  useEffect(() => {
    function loadSavedPosts() {
      try {
        const raw = localStorage.getItem(SAVED_POSTS_KEY);
        setSavedPosts(normalizeSavedPosts(raw ? JSON.parse(raw) : []));
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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F10") {
        event.preventDefault();
        setOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mobile = window.matchMedia("(max-width: 980px)").matches;
    const previousOverflow = document.body.style.overflow;

    root.style.setProperty("--wiki-nav-offset", open ? DESKTOP_PANEL_WIDTH : "0px");
    root.dataset.wikiNavigationOpen = open ? "true" : "false";

    if (open && mobile) {
      document.body.style.overflow = "hidden";
    }

    const focusTimer = open
      ? window.setTimeout(() => searchInputRef.current?.focus(), 160)
      : undefined;

    return () => {
      if (focusTimer) {
        window.clearTimeout(focusTimer);
      }

      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--wiki-nav-offset");
      delete document.documentElement.dataset.wikiNavigationOpen;
    };
  }, []);

  return (
    <>
      <header className={styles.siteHeader}>
        <div className={styles.siteHeaderInner}>
          <Link href="/wiki" className={styles.headerLogo}>
            <span>NOT LEGAL</span>
            <b>RP</b>
            <i>{"// WIKI"}</i>
          </Link>

          <button
            className={styles.headerSearch}
            onClick={openNavigation}
            type="button"
          >
            <span aria-hidden="true">⌕</span>
            <b>Поиск по статьям...</b>
            <kbd>F10</kbd>
          </button>

          <div className={styles.headerActions}>
            <Link href="/wiki">Главная</Link>
            <button onClick={openNavigation} type="button">
              <span aria-hidden="true">☰</span>
              <b>Статьи</b>
            </button>
          </div>
        </div>
      </header>

      <button
        aria-expanded={open}
        aria-label="Открыть навигацию по статьям"
        className={styles.trigger}
        onClick={openNavigation}
        type="button"
      >
        <span aria-hidden="true">☰</span>
        <b>Статьи</b>
        <kbd>F10</kbd>
      </button>

      <div
        aria-hidden={!open}
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) {
            setOpen(false);
          }
        }}
      />

      <aside
        aria-label="Навигация по Wiki"
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      >
        <header className={styles.panelHeader}>
          <Link href="/wiki" className={styles.logo} onClick={() => setOpen(false)}>
            <span>NOT LEGAL</span>
            <b>RP</b>
            <i>/ WIKI</i>
          </Link>

          <button
            aria-label="Закрыть навигацию"
            className={styles.closeButton}
            onClick={() => setOpen(false)}
            type="button"
          >
            ×
          </button>
        </header>

        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию или описанию"
            ref={searchInputRef}
            value={query}
          />
          {query && (
            <button aria-label="Очистить поиск" onClick={() => setQuery("")} type="button">
              ×
            </button>
          )}
        </label>

        <div className={styles.navigationHeading}>
          <span>Навигация</span>
          <i />
          <b>{articles.length}</b>
        </div>

        <nav className={styles.groups}>
          {savedArticles.length > 0 && (
            <section className={styles.savedGroup}>
              <button
                aria-expanded={savedSectionExpanded}
                className={styles.savedGroupHeading}
                onClick={() => {
                  if (!query.trim()) {
                    setSavedExpanded((value) => !value);
                  }
                }}
                type="button"
              >
                <span aria-hidden="true">★</span>
                <b>Сохранённые</b>
                <small>{savedArticles.length}</small>
                <i className={savedSectionExpanded ? styles.chevronOpen : ""}>›</i>
              </button>

              <div
                className={`${styles.groupContent} ${
                  savedSectionExpanded ? styles.groupContentOpen : ""
                }`}
              >
                <div className={styles.savedArticles}>
                  {savedArticles.map((article) => {
                    const active = article.slug === currentSlug;

                    return (
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={`${styles.articleLink} ${
                          active ? styles.articleLinkActive : ""
                        }`}
                        href={article.href}
                        key={`saved-${article.id}`}
                        onClick={() => setOpen(false)}
                      >
                        <span aria-hidden="true">★</span>
                        <div>
                          <b>{article.title}</b>
                          <small>{categoryLabel(article.category)}</small>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {groupedArticles.length === 0 && (
            <div className={styles.empty}>По вашему запросу ничего не найдено.</div>
          )}

          {groupedArticles.map(([category, categoryArticles]) => {
            const isExpanded = query.trim()
              ? true
              : (expanded[category] ?? category === currentCategory);
            const hasCurrent = categoryArticles.some(
              (article) => article.slug === currentSlug
            );

            return (
              <section
                className={`${styles.group} ${hasCurrent ? styles.groupCurrent : ""}`}
                key={category}
              >
                <button
                  aria-expanded={isExpanded}
                  className={styles.groupButton}
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [category]: !isExpanded,
                    }))
                  }
                  type="button"
                >
                  <span className={styles.groupIcon} aria-hidden="true">
                    {categoryIcons[category] || "□"}
                  </span>
                  <b>{categoryLabel(category)}</b>
                  <small>{categoryArticles.length}</small>
                  <i className={isExpanded ? styles.chevronOpen : ""}>›</i>
                </button>

                <div
                  className={`${styles.groupContent} ${
                    isExpanded ? styles.groupContentOpen : ""
                  }`}
                >
                  <div>
                    {categoryArticles.map((article) => {
                      const active = article.slug === currentSlug;

                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`${styles.articleLink} ${
                            active ? styles.articleLinkActive : ""
                          }`}
                          href={article.href}
                          key={article.id}
                          onClick={() => setOpen(false)}
                        >
                          <span aria-hidden="true">{active ? "●" : "○"}</span>
                          <div>
                            <b>{article.title}</b>
                            {article.description && <small>{article.description}</small>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </nav>

        <footer className={styles.footer}>
          <span><kbd>F10</kbd> открыть / закрыть</span>
          <span><kbd>Esc</kbd> закрыть</span>
        </footer>
      </aside>
    </>
  );
}
