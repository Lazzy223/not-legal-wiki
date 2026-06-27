"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WikiContent from "@/components/wiki-content";
import type { RuleSection } from "@/lib/rules-store";
import styles from "./rules.module.css";

export default function RulesPage() {
  const [rulesSections, setRulesSections] = useState<RuleSection[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdminButton, setShowAdminButton] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [rulesResponse, meResponse] = await Promise.all([
          fetch("/api/wiki/rules", {
            cache: "no-store",
          }),
          fetch("/api/auth/me", {
            cache: "no-store",
          }),
        ]);

        const rulesData = await rulesResponse.json();
        const meData = await meResponse.json();

        if (rulesResponse.ok) {
          const sections = rulesData.sections || [];

          setRulesSections(sections);

          if (sections.length > 0) {
            setActiveId(sections[0].id);
          }
        }

        if (meResponse.ok) {
          setShowAdminButton(Boolean(meData.user?.canOpenAdmin));
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
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
        items: block.items.filter((item) => item.toLowerCase().includes(query)),
      }))
      .filter((block) => {
        return (
          block.title.toLowerCase().includes(query) || block.items.length > 0
        );
      });
  }, [activeSection, search]);

  function scrollToTop() {
    const start = window.scrollY;
    const duration = 700;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      window.scrollTo(0, start * (1 - ease));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  const hasRichContent = Boolean(activeSection?.contentHtml?.trim());

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/wiki" className={styles.logo}>
          <span>NLRP</span>
          RULES
        </Link>

        <div className={styles.search}>
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по выбранному разделу..."
          />
        </div>

        <div className={styles.topActions}>
          {showAdminButton && (
            <Link href="/admin/rules" className={styles.adminButton}>
              Админ-панель
            </Link>
          )}

          <Link href="/wiki" className={styles.backButton}>
            ← Wiki
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>SERVER RULES</div>

          <h1>
            Правила <br />
            <span>проекта</span>
          </h1>

          <p>
            Выбери нужную категорию правил. Раздел откроется сразу на этой
            странице без перезагрузки.
          </p>
        </div>

        <div className={styles.heroCard}>
          <span>RULE BOOK</span>
          <b>{rulesSections.length}</b>
          <p>разделов правил</p>
        </div>
      </section>

      {loading && (
        <section className={styles.layout}>
          <div className={styles.empty}>Загрузка правил сервера...</div>
        </section>
      )}

      {!loading && rulesSections.length === 0 && (
        <section className={styles.layout}>
          <div className={styles.empty}>
            Правила пока не добавлены. Зайди в админ-панель и создай первый
            раздел.
          </div>
        </section>
      )}

      {!loading && rulesSections.length > 0 && (
        <section className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>
              <span>01</span>
              <b>Категории</b>
            </div>

            <div className={styles.tabs}>
              {rulesSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveId(section.id);
                    setSearch("");
                  }}
                  className={`${styles.tabButton} ${
                    activeId === section.id ? styles.tabButtonActive : ""
                  }`}
                >
                  <div className={styles.tabIcon}>{section.icon}</div>

                  <div>
                    <span>{section.number}</span>
                    <b>{section.title}</b>
                    <p>{section.short}</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.content}>
            {activeSection && (
              <>
                <div className={styles.contentHeader}>
                  <div>
                    <span>{activeSection.number}</span>

                    <h2>{activeSection.title}</h2>

                    <p>{activeSection.description}</p>
                  </div>

                  <div className={styles.contentIcon}>{activeSection.icon}</div>
                </div>

                {hasRichContent ? (
                  <div className={styles.richRulesContent}>
                    <WikiContent html={activeSection.contentHtml || ""} />
                  </div>
                ) : (
                  <>
                    {filteredRules.length === 0 && (
                      <div className={styles.empty}>
                        По запросу ничего не найдено в выбранном разделе.
                      </div>
                    )}

                    <div className={styles.rulesBlocks}>
                      {filteredRules.map((block, index) => (
                        <article
                          className={styles.ruleBlock}
                          key={`${block.title}-${index}`}
                        >
                          <div className={styles.blockNumber}>
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <h3>{block.title}</h3>

                          <ul>
                            {block.items.map((item, itemIndex) => (
                              <li key={`${block.title}-${itemIndex}`}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </section>
      )}

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