"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangelogPost } from "@/lib/changelog-store";
import styles from "./devblog-post-card.module.css";

type DevBlogPostCardProps = {
  post: ChangelogPost;
  searchQuery?: string;
};

type SavedPost = {
  title: string;
  href: string;
};

type ChangelogPostExtra = ChangelogPost & {
  description?: string;
  category?: string;
  tags?: string[];
};

const SAVED_KEY = "notlegal_saved_posts";

const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const shortMonthNames = [
  "ЯНВ",
  "ФЕВ",
  "МАР",
  "АПР",
  "МАЯ",
  "ИЮН",
  "ИЮЛ",
  "АВГ",
  "СЕН",
  "ОКТ",
  "НОЯ",
  "ДЕК",
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      day: "--",
      month: "—",
      year: "",
      fullDate: value || "Дата не указана",
      time: "",
    };
  }

  return {
    day: String(date.getDate()),
    month: shortMonthNames[date.getMonth()],
    year: String(date.getFullYear()),
    fullDate: `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`,
    time: date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function isPostNew(value: string) {
  const postDate = new Date(value);

  if (Number.isNaN(postDate.getTime())) {
    return false;
  }

  const fiveDays = 1000 * 60 * 60 * 24 * 5;
  const difference = Date.now() - postDate.getTime();

  return difference >= 0 && difference <= fiveDays;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, query?: string) {
  const cleanQuery = query?.trim();

  if (!cleanQuery) {
    return text;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(cleanQuery)})`, "gi"));

  return parts.map((part, index) => {
    if (part.toLowerCase() === cleanQuery.toLowerCase()) {
      return (
        <mark className={styles.highlightMark} key={`${part}-${index}`}>
          {part}
        </mark>
      );
    }

    return part;
  });
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(li|p|div|h[1-6])>/gi, "\n")
      .replace(/<(li|p|div|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\u00a0/g, " ")
  ).trim();
}

function splitToItems(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getItemsFromHtml(html?: string) {
  if (!html) {
    return [];
  }

  const liMatches = html.match(/<li[^>]*>[\s\S]*?<\/li>/gi);

  if (liMatches && liMatches.length > 0) {
    return liMatches
      .flatMap((item) => splitToItems(stripTags(item)))
      .filter(Boolean);
  }

  return splitToItems(stripTags(html));
}

function getContentItems(html: string | undefined, fallback: string[] | undefined) {
  const htmlItems = getItemsFromHtml(html);

  if (htmlItems.length > 0) {
    return htmlItems;
  }

  return fallback?.filter(Boolean) || [];
}

function getPostDescription(
  post: ChangelogPostExtra,
  updatesItems: string[],
  fixesItems: string[]
) {
  if (post.description?.trim()) {
    return post.description.trim();
  }

  const firstUpdate = updatesItems[0];
  const firstFix = fixesItems[0];

  if (firstUpdate && firstFix) {
    return `${firstUpdate} Также внесены исправления и улучшения стабильности.`;
  }

  if (firstUpdate) {
    return firstUpdate;
  }

  if (firstFix) {
    return firstFix;
  }

  return "Краткое описание обновления пока не заполнено.";
}

function getCategoryTag(post: ChangelogPostExtra) {
  if (post.category?.trim()) {
    return post.category.trim();
  }

  if (post.tags?.[0]?.trim()) {
    return post.tags[0].trim();
  }

  const title = post.title.toLowerCase();

  if (title.includes("эконом")) return "Экономика";
  if (title.includes("фракц")) return "Фракции";
  if (title.includes("транспорт")) return "Транспорт";
  if (title.includes("гараж")) return "Транспорт";
  if (title.includes("дом")) return "Дома";
  if (title.includes("бизнес")) return "Бизнес";

  return "Dev Blog";
}

export default function DevBlogPostCard({
  post,
  searchQuery = "",
}: DevBlogPostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const postData = post as ChangelogPostExtra;

  const updatesItems = getContentItems(post.updatesHtml, post.updates);
  const fixesItems = getContentItems(post.fixesHtml, post.fixes);

  const updatesCount = updatesItems.length;
  const fixesCount = fixesItems.length;

  const formattedDate = formatDate(post.publishedAt);
  const cleanSearch = searchQuery.trim();
  const description = getPostDescription(postData, updatesItems, fixesItems);
  const categoryTag = getCategoryTag(postData);
  const showNewBadge = isPostNew(post.publishedAt);

  const maxUpdates = 5;
  const maxFixes = 4;

  const hasHiddenContent = updatesCount > maxUpdates || fixesCount > maxFixes;

  const visibleUpdates = isOpen || cleanSearch
    ? updatesItems
    : updatesItems.slice(0, maxUpdates);

  const visibleFixes = isOpen || cleanSearch
    ? fixesItems
    : fixesItems.slice(0, maxFixes);

  const postHref = `/wiki/changelog#${encodeURIComponent(post.id)}`;

  const postHasSearchMatch = useMemo(() => {
    if (!cleanSearch) {
      return false;
    }

    const fullText = [
      post.title,
      description,
      formattedDate.fullDate,
      formattedDate.time,
      ...updatesItems,
      ...fixesItems,
    ]
      .join(" ")
      .toLowerCase();

    return fullText.includes(cleanSearch.toLowerCase());
  }, [
    cleanSearch,
    post.title,
    description,
    formattedDate.fullDate,
    formattedDate.time,
    updatesItems,
    fixesItems,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const savedPosts: SavedPost[] = raw ? JSON.parse(raw) : [];

      setIsSaved(savedPosts.some((item) => item.href === postHref));
    } catch {
      setIsSaved(false);
    }
  }, [postHref]);

  function toggleSave() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const savedPosts: SavedPost[] = raw ? JSON.parse(raw) : [];

      const exists = savedPosts.some((item) => item.href === postHref);

      const nextPosts = exists
        ? savedPosts.filter((item) => item.href !== postHref)
        : [{ title: post.title, href: postHref }, ...savedPosts];

      localStorage.setItem(SAVED_KEY, JSON.stringify(nextPosts));
      setIsSaved(!exists);

      window.dispatchEvent(new Event("notlegal-saved-posts-change"));
    } catch {
      alert("Не удалось сохранить пост");
    }
  }

  function togglePost() {
    if (isOpen) {
      setIsOpen(false);

      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 80);

      return;
    }

    setIsOpen(true);
  }

  return (
    <article
      className={`${styles.card} ${
        postHasSearchMatch ? styles.cardSearchMatch : ""
      }`}
      ref={cardRef}
    >
      <aside className={styles.dateColumn}>
        <strong>{formattedDate.day}</strong>
        <span>{formattedDate.month}</span>
        <b>{formattedDate.year}</b>
      </aside>

      <section className={styles.infoColumn}>
        <div className={styles.metaLine}>
          <span>{formattedDate.fullDate}</span>

          {formattedDate.time && <span>{formattedDate.time}</span>}

          {showNewBadge && <b>Новое</b>}
        </div>

        <h2>{renderHighlightedText(post.title, cleanSearch)}</h2>

        <p>{renderHighlightedText(description, cleanSearch)}</p>

        <div className={styles.tags}>
          <span className={styles.redTag}>Обновление</span>
          <span>{categoryTag}</span>
        </div>
      </section>

      <section className={styles.updateColumn}>
        <div className={styles.blockTitle}>
          <span>↟</span>
          <b>Обновления</b>
          <small>{updatesCount}</small>
        </div>

        <div className={styles.contentWrap}>
          {visibleUpdates.length > 0 ? (
            <ul>
              {visibleUpdates.map((item, index) => (
                <li key={`update-${index}`}>
                  {renderHighlightedText(item, cleanSearch)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет пунктов обновлений.</p>
          )}
        </div>
      </section>

      <section className={styles.fixColumn}>
        <div className={styles.blockTitleFix}>
          <span>⌁</span>
          <b>Исправления</b>
          <small>{fixesCount}</small>
        </div>

        <div className={styles.contentWrap}>
          {visibleFixes.length > 0 ? (
            <ul>
              {visibleFixes.map((item, index) => (
                <li key={`fix-${index}`}>
                  {renderHighlightedText(item, cleanSearch)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет пунктов исправлений.</p>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={toggleSave}
        className={`${styles.saveButton} ${
          isSaved ? styles.saveButtonActive : ""
        }`}
        title={isSaved ? "Убрать из сохранённых" : "Сохранить пост"}
      >
        {isSaved ? "★" : "☆"}
      </button>

      {hasHiddenContent && (
        <button type="button" onClick={togglePost} className={styles.toggleButton}>
          {isOpen ? "Свернуть" : "Читать далее"}
          <span>{isOpen ? "↑" : "↓"}</span>
        </button>
      )}
    </article>
  );
}