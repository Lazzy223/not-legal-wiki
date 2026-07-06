"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import WikiContent from "@/components/wiki-content";
import WikiTopActions from "@/components/wiki-top-actions";
import {
  addRuleHeadingAnchors,
  extractRuleHeadings,
  getRuleItemCount,
  getRuleSectionHtml,
  ruleSectionMatches,
} from "@/lib/rules-content";
import type { RuleSection } from "@/lib/rules-store";
import { formatMoscowDate } from "@/lib/moscow-time";
import styles from "./rules.module.css";

function formatSectionDate(value?: string) {
  if (!value) return "Не указано";

  return formatMoscowDate(
    value,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    value
  );
}

export default function RulesPage() {
  const [rulesSections, setRulesSections] = useState<RuleSection[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadRules() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/wiki/rules", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Не удалось загрузить правила");
        }

        const sections = Array.isArray(data?.sections)
          ? (data.sections as RuleSection[])
          : [];

        setRulesSections(sections);

        if (sections.length > 0) {
          setActiveId((current) => current || sections[0].id);
        }
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить правила"
        );
      } finally {
        setLoading(false);
      }
    }

    loadRules();
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

  const visibleSections = useMemo(() => {
    return rulesSections.filter((section) => ruleSectionMatches(section, search));
  }, [rulesSections, search]);

  const activeSection = useMemo(() => {
    return (
      visibleSections.find((section) => section.id === activeId) ||
      visibleSections[0] ||
      null
    );
  }, [activeId, visibleSections]);

  const activeHtml = useMemo(() => {
    if (!activeSection) return "";
    return addRuleHeadingAnchors(getRuleSectionHtml(activeSection));
  }, [activeSection]);

  const activeHeadings = useMemo(() => {
    return extractRuleHeadings(activeHtml);
  }, [activeHtml]);

  const totalRules = useMemo(() => {
    return rulesSections.reduce(
      (total, section) => total + getRuleItemCount(section),
      0
    );
  }, [rulesSections]);

  const activeRuleCount = getRuleItemCount(activeSection || undefined);
  const activeUpdatedAt = formatSectionDate(activeSection?.updatedAt);
  const activeVersion = activeSection?.version || "1.0";

  function chooseSection(id: string) {
    setActiveId(id);
    window.scrollTo({ top: 270, behavior: "smooth" });
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
          <Link href="/wiki/laws">Законка</Link>
          <Link href="/wiki/rules" className={styles.activeNav}>
            Правила
          </Link>
        </nav>

        <div className={styles.search}>
          <span>⌕</span>

          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по всем правилам..."
            aria-label="Поиск по правилам"
          />

          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={styles.clearSearch}
              aria-label="Очистить поиск"
            >
              ×
            </button>
          ) : (
            <kbd>Ctrl + K</kbd>
          )}
        </div>

        <WikiTopActions />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Главная</Link>
            <span>›</span>
            <Link href="/wiki">Wiki</Link>
            <span>›</span>
            <b>Правила</b>
          </div>

          <span className={styles.heroEyebrow}>NOT LEGAL ROLE PLAY</span>
          <h1>Правила проекта</h1>

          <p>
            Единый свод правил Not Legal RP. Перед началом игры ознакомься с
            каждым разделом — незнание правил не освобождает от ответственности.
          </p>
        </div>

        <div className={styles.heroMark}>NLRP</div>
      </section>

      <section className={styles.statsBar}>
        <div className={styles.statItem}>
          <span>▤</span>
          <div>
            <small>Разделов правил</small>
            <b>{rulesSections.length}</b>
          </div>
        </div>

        <div className={styles.statItem}>
          <span>≡</span>
          <div>
            <small>Всего пунктов</small>
            <b>{totalRules}</b>
          </div>
        </div>

        <div className={styles.statItem}>
          <span>◷</span>
          <div>
            <small>Активный раздел</small>
            <b>
              v{activeVersion} · {activeUpdatedAt}
            </b>
          </div>
        </div>
      </section>

      {loading && (
        <section className={styles.loadingState}>
          <div className={styles.loader} />
          <div>
            <b>Загружаем правила</b>
            <span>Подготавливаем актуальную редакцию разделов...</span>
          </div>
        </section>
      )}

      {!loading && loadError && (
        <section className={`${styles.loadingState} ${styles.errorState}`}>
          <span>!</span>
          <div>
            <b>Правила не загрузились</b>
            <small>{loadError}</small>
          </div>
        </section>
      )}

      {!loading && !loadError && rulesSections.length === 0 && (
        <section className={styles.loadingState}>
          Правила пока не добавлены. Создай первый раздел через админ-панель.
        </section>
      )}

      {!loading && !loadError && search && (
        <section className={styles.searchSummary}>
          <div>
            <span>⌕</span>
            <p>
              По запросу <b>«{search}»</b> найдено разделов: {visibleSections.length}
            </p>
          </div>

          <button type="button" onClick={() => setSearch("")}>
            Сбросить поиск
          </button>
        </section>
      )}

      {!loading && !loadError && search && visibleSections.length === 0 && (
        <section className={styles.noGlobalResults}>
          <span>⌕</span>
          <h2>Ничего не найдено</h2>
          <p>
            Попробуй изменить формулировку запроса или выбери раздел вручную
            после сброса поиска.
          </p>
          <button type="button" onClick={() => setSearch("")}>
            Показать все правила
          </button>
        </section>
      )}

      {!loading && activeSection && (
        <section className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHead}>
              <div>
                <span>Разделы</span>
                <small>Выбери категорию правил</small>
              </div>
              <b>{visibleSections.length}</b>
            </div>

            <div className={styles.tabs}>
              {visibleSections.map((section) => {
                const active = section.id === activeSection.id;

                return (
                  <button
                    type="button"
                    className={`${styles.tabButton} ${
                      active ? styles.tabButtonActive : ""
                    }`}
                    onClick={() => chooseSection(section.id)}
                    key={section.id}
                  >
                    <div className={styles.tabIcon}>{section.icon}</div>

                    <div className={styles.tabText}>
                      <span>
                        {section.number} · v{section.version || "1.0"}
                      </span>
                      <strong>{section.title}</strong>
                      <small>{section.short || "Раздел правил проекта"}</small>
                    </div>

                    <span className={styles.tabCount}>
                      {getRuleItemCount(section)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.content}>
            <div className={styles.contentHeader}>
              <div className={styles.contentHeaderIcon}>{activeSection.icon}</div>

              <div className={styles.contentHeaderText}>
                <div className={styles.contentKicker}>
                  <span>Раздел {activeSection.number}</span>
                  <b>Версия {activeVersion}</b>
                </div>

                <h2>{activeSection.title}</h2>
                <p>
                  {activeSection.description ||
                    activeSection.short ||
                    "Актуальная редакция правил выбранного раздела."}
                </p>

                <div className={styles.contentMeta}>
                  <span>◷ Обновлено: {activeUpdatedAt}</span>
                  <span>≡ {activeRuleCount} пунктов</span>
                </div>
              </div>
            </div>

            <div className={styles.noticeCard}>
              <span>!</span>
              <div>
                <b>Обрати внимание</b>
                <p>
                  Администрация вправе оценивать ситуацию в полном контексте.
                  Перед участием в игровом процессе проверь актуальность версии.
                </p>
              </div>
            </div>

            <article className={styles.richRulesContent}>
              <WikiContent html={activeHtml} />
            </article>
          </section>

          <aside className={styles.rightSidebar}>
            <div className={styles.sideCard}>
              <div className={styles.sideCardHead}>
                <h3>В этом разделе</h3>
                <span>{activeHeadings.length}</span>
              </div>

              {activeHeadings.length > 0 ? (
                <div className={styles.anchorList}>
                  {activeHeadings.map((heading, index) => (
                    <a
                      href={`#${heading.id}`}
                      className={
                        heading.level === 3 ? styles.anchorSubItem : ""
                      }
                      key={`${heading.id}-${index}`}
                    >
                      <span>{heading.level === 2 ? index + 1 : "•"}</span>
                      {heading.text}
                    </a>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyAnchors}>
                  Добавь заголовки в редакторе — они появятся здесь автоматически.
                </p>
              )}
            </div>

            <div className={styles.sideCard}>
              <h3>Полезные ссылки</h3>

              <div className={styles.usefulLinks}>
                <Link href="/wiki/support">⚑ Сообщить о нарушении</Link>
                <Link href="/wiki/support">◇ Обжаловать наказание</Link>
                <Link href="/wiki/faq">? Частые вопросы</Link>
                <Link href="/wiki/support">◌ Связь с администрацией</Link>
              </div>
            </div>

            <div className={styles.versionCard}>
              <span>Текущая редакция</span>
              <strong>v{activeVersion}</strong>
              <small>{activeUpdatedAt}</small>
            </div>
          </aside>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <strong>
            NOT LEGAL <span>RP</span>
          </strong>

          <p>
            Проект для тех, кто ценит порядок, атмосферу и качественную
            ролевую игру.
          </p>
        </div>

        <div className={styles.footerLinks}>
          <div>
            <b>Навигация</b>
            <Link href="/">Главная</Link>
            <Link href="/wiki">Wiki</Link>
            <Link href="/wiki/changelog">Новости</Link>
          </div>

          <div>
            <b>Поддержка</b>
            <Link href="/wiki/faq">FAQ</Link>
            <Link href="/wiki/support">Обращения</Link>
            <Link href="/wiki/rules">Правила</Link>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2026 Not Legal RP
          <span>Все права защищены.</span>
        </div>
      </footer>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={styles.upButton}
        aria-label="Вернуться наверх"
      >
        ↑
      </button>
    </main>
  );
}
