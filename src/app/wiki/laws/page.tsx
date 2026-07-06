"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import LegalContent from "@/components/legal-content";
import WikiTopActions from "@/components/wiki-top-actions";
import {
  addLawHeadingAnchors,
  getLawArticleCount,
  getLawHeadings,
  lawDocumentMatches,
} from "@/lib/laws-content";
import type { LawDocument } from "@/lib/laws-store";
import { formatMoscowDate } from "@/lib/moscow-time";
import styles from "./laws.module.css";

function formatDate(value?: string) {
  if (!value) return "Не указано";

  return formatMoscowDate(
    value,
    { day: "2-digit", month: "long", year: "numeric" },
    value
  );
}

export default function LawsPage() {
  const [documents, setDocuments] = useState<LawDocument[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/wiki/laws", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "Не удалось загрузить законодательство");
        }
        return Array.isArray(data?.documents)
          ? (data.documents as LawDocument[])
          : [];
      })
      .then((loadedDocuments) => {
        if (cancelled) return;

        setDocuments(loadedDocuments);
        const requestedId = new URLSearchParams(window.location.search).get("law");
        const selected = loadedDocuments.find((item) => item.id === requestedId);
        setActiveId(selected?.id || loadedDocuments[0]?.id || "");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить законодательство"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearch("");
        searchInputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const visibleDocuments = useMemo(
    () => documents.filter((item) => lawDocumentMatches(item, search)),
    [documents, search]
  );

  const activeDocument = useMemo(
    () =>
      visibleDocuments.find((item) => item.id === activeId) ||
      visibleDocuments[0] ||
      null,
    [activeId, visibleDocuments]
  );

  const activeHtml = useMemo(
    () => addLawHeadingAnchors(activeDocument?.contentHtml || ""),
    [activeDocument]
  );

  const headings = useMemo(() => getLawHeadings(activeHtml), [activeHtml]);

  const totalArticles = useMemo(
    () =>
      documents.reduce(
        (total, item) => total + getLawArticleCount(item.contentHtml),
        0
      ),
    [documents]
  );

  const latestUpdate = useMemo(() => {
    return documents.reduce((latest, item) => {
      if (!item.updatedAt) return latest;
      return !latest || item.updatedAt > latest ? item.updatedAt : latest;
    }, "");
  }, [documents]);

  function chooseDocument(id: string) {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("law", id);
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 260, behavior: "smooth" });
  }

  async function copyDocumentLink() {
    if (!activeDocument) return;

    const url = new URL(window.location.href);
    url.searchParams.set("law", activeDocument.id);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
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
          <Link href="/wiki/laws" className={styles.activeNav}>
            Законка
          </Link>
          <Link href="/wiki/rules">Правила</Link>
        </nav>

        <label className={styles.search}>
          <span>⌕</span>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по законодательству..."
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")}>
              ×
            </button>
          ) : (
            <kbd>Ctrl + K</kbd>
          )}
        </label>

        <WikiTopActions />
      </header>

      <section className={styles.hero}>
        <div>
          <div className={styles.breadcrumbs}>
            <Link href="/">Главная</Link>
            <span>›</span>
            <Link href="/wiki">Wiki</Link>
            <span>›</span>
            <b>Законодательство</b>
          </div>

          <span className={styles.eyebrow}>НОРМАТИВНАЯ БАЗА ШТАТА</span>
          <h1>Законодательство</h1>
          <p>
            Законы, кодексы и иные нормативные акты в единой официальной
            структуре с быстрым переходом по разделам, главам и статьям.
          </p>
        </div>

        <div className={styles.heroSymbol}>§</div>
      </section>

      <section className={styles.stats}>
        <article>
          <span>Документов</span>
          <b>{documents.length}</b>
        </article>
        <article>
          <span>Статей</span>
          <b>{totalArticles}</b>
        </article>
        <article>
          <span>Последнее изменение</span>
          <b>{formatDate(latestUpdate)}</b>
        </article>
      </section>

      {loading && <div className={styles.state}>Загружаем законодательство...</div>}
      {!loading && loadError && (
        <div className={`${styles.state} ${styles.errorState}`}>{loadError}</div>
      )}
      {!loading && !loadError && documents.length === 0 && (
        <div className={styles.state}>
          Законодательство пока не опубликовано. Документы добавляются через
          административную панель.
        </div>
      )}

      {!loading && !loadError && documents.length > 0 && (
        <section className={styles.layout}>
          <aside className={styles.catalog}>
            <div className={styles.panelTitle}>
              <span>Документы</span>
              <b>{visibleDocuments.length}</b>
            </div>

            <div className={styles.documentList}>
              {visibleDocuments.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => chooseDocument(item.id)}
                  className={
                    activeDocument?.id === item.id ? styles.documentActive : ""
                  }
                >
                  <span>{item.icon || "§"}</span>
                  <div>
                    <small>{item.category}</small>
                    <strong>{item.title}</strong>
                    <em>Редакция {item.version}</em>
                  </div>
                </button>
              ))}
            </div>

            {visibleDocuments.length === 0 && (
              <div className={styles.emptySearch}>По запросу ничего не найдено.</div>
            )}
          </aside>

          {activeDocument && (
            <article className={styles.document}>
              <header className={styles.documentHeader}>
                <div className={styles.documentIcon}>{activeDocument.icon || "§"}</div>

                <div className={styles.documentIdentity}>
                  <div className={styles.documentCategory}>
                    {activeDocument.category}
                  </div>
                  <h2>{activeDocument.title}</h2>
                  {activeDocument.subtitle && <p>{activeDocument.subtitle}</p>}
                </div>

                <div className={styles.documentActions}>
                  <button type="button" onClick={copyDocumentLink}>
                    {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
                  </button>
                  <button type="button" onClick={() => window.print()}>
                    Печать
                  </button>
                </div>
              </header>

              {activeDocument.description && (
                <p className={styles.documentDescription}>
                  {activeDocument.description}
                </p>
              )}

              <div className={styles.documentMeta}>
                <span>№ {activeDocument.number || "—"}</span>
                <span>Редакция {activeDocument.version}</span>
                <span>Принят: {formatDate(activeDocument.adoptedAt)}</span>
                <span>Обновлён: {formatDate(activeDocument.updatedAt)}</span>
              </div>

              <div className={styles.legalPaper}>
                <LegalContent html={activeHtml} />
              </div>
            </article>
          )}

          <aside className={styles.contents}>
            <div className={styles.panelTitle}>
              <span>Содержание</span>
              <b>{headings.length}</b>
            </div>

            <nav>
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={styles[`level${heading.level}`]}
                >
                  {heading.title}
                </a>
              ))}
            </nav>

            {headings.length === 0 && (
              <div className={styles.emptySearch}>
                Добавь в документ разделы, главы и статьи — они появятся здесь.
              </div>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
