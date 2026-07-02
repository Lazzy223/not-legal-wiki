"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import WikiContent from "@/components/wiki-content";
import WikiTopActions from "@/components/wiki-top-actions";
import type { RuleSection } from "@/lib/rules-store";
import styles from "./rules.module.css";

type RuleSectionWithMeta = RuleSection & {
  updatedAt?: string;
  updated?: string;
  lastUpdated?: string;
  modifiedAt?: string;
  version?: string;
};

function getSectionUpdatedValue(section?: RuleSectionWithMeta) {
  if (!section) return "";

  return (
    section.updatedAt ||
    section.updated ||
    section.lastUpdated ||
    section.modifiedAt ||
    ""
  );
}

function formatSectionDate(section?: RuleSectionWithMeta) {
  const value = getSectionUpdatedValue(section);

  if (!value) {
    return "Не указано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getRuleCount(section: RuleSectionWithMeta) {
  const blocksCount = (section.blocks || []).reduce((total, block) => {
    return total + (block.items?.length || 0);
  }, 0);

  if (blocksCount > 0) {
    return blocksCount;
  }

  const html = section.contentHtml || "";
  const listItems = html.match(/<li\b[^>]*>/gi);

  return listItems?.length || 0;
}

function makeAnchor(value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return `rule-section-${slug || index + 1}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return <>{text}</>;
  }

  const parts = text.split(
    new RegExp(`(${escapeRegExp(cleanQuery)})`, "gi")
  );

  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === cleanQuery.toLowerCase()) {
          return (
            <mark className={styles.searchMatch} key={`${part}-${index}`}>
              {part}
            </mark>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

export default function RulesPage() {
  const [rulesSections, setRulesSections] = useState<RuleSectionWithMeta[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadRules() {
      try {
        const response = await fetch("/api/wiki/rules", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          return;
        }

        const sections = (data.sections || []) as RuleSectionWithMeta[];

        setRulesSections(sections);

        if (sections.length > 0) {
          setActiveId((current) => current || sections[0].id);
        }
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
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeSection = useMemo(() => {
    return (
      rulesSections.find((section) => section.id === activeId) ||
      rulesSections[0]
    );
  }, [activeId, rulesSections]);

  const filteredRules = useMemo(() => {
    if (!activeSection) return [];

    const query = search.trim().toLowerCase();

    if (!query) {
      return activeSection.blocks || [];
    }

    return (activeSection.blocks || [])
      .map((block) => ({
        ...block,
        items: (block.items || []).filter((item) =>
          item.toLowerCase().includes(query)
        ),
      }))
      .filter((block) => {
        return (
          block.title.toLowerCase().includes(query) || block.items.length > 0
        );
      });
  }, [activeSection, search]);

  const hasRichContent = Boolean(activeSection?.contentHtml?.trim());
  const activeUpdatedAt = formatSectionDate(activeSection);
  const activeVersion = activeSection?.version || "2.7.0";

  function chooseSection(id: string) {
    setActiveId(id);
    setSearch("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function scrollToTop() {
  const startPosition = window.scrollY;
  const duration = 750;
  const startTime = performance.now();

  function animateScroll(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easedProgress = 1 - Math.pow(1 - progress, 4);

    window.scrollTo({
      top: startPosition * (1 - easedProgress),
      left: 0,
    });

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
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
          <Link href="/wiki/changelog">Dev Blog</Link>
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
            placeholder="Поиск по правилам..."
          />

          <kbd>Ctrl + K</kbd>
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

          <h1>Правила проекта</h1>

          <p>
            Здесь собраны все важные правила проекта Not Legal RP.
            Незнание правил не освобождает от ответственности.
          </p>
        </div>

        <div className={styles.heroMark}>NLRP</div>
      </section>

      <section className={styles.statsBar}>
        <div className={styles.statItem}>
          <span>◷</span>
          <div>
            <small>Обновление раздела</small>
            <b>{activeUpdatedAt}</b>
          </div>
        </div>

        <div className={styles.statItem}>
          <span>▧</span>
          <div>
            <small>Версия правил</small>
            <b>{activeVersion}</b>
          </div>
        </div>

        <div className={styles.statItem}>
          <span>▤</span>
          <div>
            <small>Разделов правил</small>
            <b>{rulesSections.length}</b>
          </div>
        </div>
      </section>

      {loading && (
        <section className={styles.loadingState}>
          Загрузка правил сервера...
        </section>
      )}

      {!loading && rulesSections.length === 0 && (
        <section className={styles.loadingState}>
          Правила пока не добавлены. Создай первый раздел через админ-панель.
        </section>
      )}

      {!loading && activeSection && (
        <section className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHead}>
              <span>Разделы</span>
              <b>{rulesSections.length}</b>
            </div>

            <div className={styles.tabs}>
              {rulesSections.map((section) => {
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
                      <strong>{section.title}</strong>
                      <small>
                        Обновлено: {formatSectionDate(section)}
                      </small>
                    </div>

                    <span className={styles.tabCount}>
                      {getRuleCount(section)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.content}>
            <div className={styles.contentHeader}>
              <div className={styles.contentHeaderIcon}>
                {activeSection.icon}
              </div>

              <div>
                <span>{activeSection.number}</span>
                <h2>{activeSection.title}</h2>
                <p>{activeSection.description}</p>

                <div className={styles.sectionUpdated}>
                  <span>◷</span>
                  Обновлено: {activeUpdatedAt}
                </div>
              </div>
            </div>

            {hasRichContent ? (
              <div className={styles.richRulesContent}>
                <WikiContent html={activeSection.contentHtml || ""} />
              </div>
            ) : (
              <>
                {filteredRules.length === 0 && (
                  <div className={styles.noResults}>
                    По запросу ничего не найдено в выбранном разделе.
                  </div>
                )}

                <div className={styles.rulesBlocks}>
                  {filteredRules.map((block, blockIndex) => {
                    const anchor = makeAnchor(block.title, blockIndex);

                    return (
                      <details
                        id={anchor}
                        className={styles.ruleBlock}
                        defaultOpen={blockIndex === 0}
                        key={`${block.title}-${blockIndex}`}
                      >
                        <summary className={styles.ruleBlockSummary}>
                          <div>
                            <span>{blockIndex + 1}.</span>
                            <h3>{block.title}</h3>
                          </div>

                          <div className={styles.ruleBlockMeta}>
                            <small>{block.items.length} пунктов</small>
                            <b>⌄</b>
                          </div>
                        </summary>

                        <div className={styles.ruleItems}>
                          {block.items.map((item, itemIndex) => (
                            <article
                              className={styles.ruleItem}
                              key={`${block.title}-${itemIndex}`}
                            >
                              <div className={styles.ruleNumber}>
                                {blockIndex + 1}.{itemIndex + 1}
                              </div>

                              <p>
                                <HighlightedText
                                  text={item}
                                  query={search}
                                />
                              </p>
                            </article>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <aside className={styles.rightSidebar}>
            <div className={styles.sideCard}>
              <h3>В этом разделе</h3>

              <div className={styles.anchorList}>
                {(activeSection.blocks || []).map((block, index) => (
                  <a
                    href={`#${makeAnchor(block.title, index)}`}
                    key={`${block.title}-${index}`}
                  >
                    <span>{index + 1}.</span>
                    {block.title}
                  </a>
                ))}
              </div>
            </div>

            <div className={styles.sideCard}>
              <h3>Полезно</h3>

              <div className={styles.usefulLinks}>
                <Link href="/wiki/support">⚑ Сообщить о нарушении</Link>
                <Link href="/wiki/support">◇ Обжаловать наказание</Link>
                <Link href="/wiki/faq">? Частые вопросы</Link>
                <Link href="/wiki/support">◌ Связь с администрацией</Link>
              </div>
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
        onClick={scrollToTop}
        className={styles.upButton}
        aria-label="Вернуться наверх"
      >
        ↑
      </button>
    </main>
  );
}
