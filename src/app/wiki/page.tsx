"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import StartGuideModal from "@/components/start-guide-modal";
import WikiTopActions from "@/components/wiki-top-actions";
import { formatMoscowDate } from "@/lib/moscow-time";
import styles from "./wiki.module.css";

type LatestUpdate = {
  id: string;
  title: string;
  publishedAt: string;
};

type WikiSearchApiItem = {
  id: string;
  type: "patch-note" | "article";
  title: string;
  description: string;
  href: string;
  category: string;
  searchText: string;
  date: string;
};

type SearchResultItem = {
  id: string;
  title: string;
  type: string;
  href: string;
  content: string;
  snippet: string;
};

type PopularArticle = {
  id: string;
  title: string;
  description: string;
  category: string;
  href: string;
  views: number;
  featured: boolean;
  updatedAt: string;
};

function formatViews(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

function formatUpdateDate(value: string) {
  return formatMoscowDate(
    value,
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
    "Без даты"
  );
}

const categories = [
  {
    title: "Начало игры",
    desc: "Как начать играть, создать персонажа и сделать первые шаги на сервере.",
    icon: "▶",
    type: "start",
  },
  {
    title: "Правила проекта",
    desc: "Общие правила сервера, поведение игроков и наказания за нарушения.",
    icon: "▣",
    href: "/wiki/rules",
  },
  {
    title: "Гос. организации",
    desc: "Информация о государственных структурах, их обязанностях и возможностях.",
    icon: "▥",
    href: "/wiki/government",
  },
  {
    title: "Криминальные организации",
    desc: "Криминальные фракции, их иерархия, правила и особенности.",
    icon: "◉",
    href: "/wiki/crime",
  },
  {
    title: "Dev Blog",
    desc: "Новости разработки, обновления, планы и технические детали проекта.",
    icon: "</>",
    href: "/wiki/changelog",
  },
  {
    title: "FAQ",
    desc: "Ответы на часто задаваемые вопросы от игроков о проекте и игровом процессе.",
    icon: "?",
    href: "/wiki/faq",
  },
  {
    title: "Игровые зоны",
    desc: "Описание всех зон на карте, опасных территорий и важных локаций.",
    icon: "⌖",
    href: "/wiki/zones",
  },
  {
    title: "Обращение к администрации",
    desc: "Как сообщить о нарушении или задать вопрос администрации.",
    icon: "☎",
    href: "/wiki/support",
  },
];

const articles = [
  {
    title: "Начало игры",
    type: "Гайд",
    href: "/wiki",
    content:
      "Чтобы начать играть на Not Legal RP, купите GTA V, установите RAGE Multiplayer, скопируйте IP сервера и подключитесь через клиент.",
  },
  {
    title: "Правила проекта — основные положения",
    type: "Правила",
    href: "/wiki/rules",
    content:
      "В правилах проекта описано поведение игроков, наказания за нарушения, порядок общения, игровые ограничения и основные положения сервера.",
  },
  {
    title: "Как заработать первые деньги",
    type: "Статья",
    href: "/wiki/money",
    content:
      "Первые деньги можно заработать через стартовые работы, простые задания, легальную деятельность, перевозки, доставку и другие способы для новичков.",
  },
  {
    title: "Работы и заработок",
    type: "Статья",
    href: "/wiki/jobs",
    content:
      "В разделе работ собрана информация о доступных профессиях, заработке, требованиях, маршрутах, лицензиях и возможностях развития персонажа.",
  },
  {
    title: "Система криминала и законы штата",
    type: "Статья",
    href: "/wiki/crime",
    content:
      "Криминальная система включает группировки, нелегальные действия, территории, взаимодействие с государственными структурами и ответственность по законам штата.",
  },
  {
    title: "Государственные организации",
    type: "Раздел",
    href: "/wiki/government",
    content:
      "Государственные организации отвечают за порядок, медицину, безопасность, правовую систему и другие важные направления жизни сервера.",
  },
  {
    title: "Dev Blog",
    type: "Обновления",
    href: "/wiki/changelog",
    content:
      "В Dev Blog публикуются новости разработки, патч-ноуты, изменения проекта, планы обновлений и технические детали сервера.",
  },
  {
    title: "FAQ",
    type: "Помощь",
    href: "/wiki/faq",
    content:
      "FAQ содержит ответы на частые вопросы игроков о подключении, аккаунте, игровом процессе, ошибках, правилах и возможностях проекта.",
  },
];

const quickSections = [
  "Команды сервера",
  "Лицензии и документы",
  "Транспорт",
  "Недвижимость",
  "Ивенты и мероприятия",
];

function getSnippet(text: string, query: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const cleanQuery = query.trim().toLowerCase();

  if (!cleanQuery) {
    return cleanText.slice(0, 150);
  }

  const lowerText = cleanText.toLowerCase();
  const index = lowerText.indexOf(cleanQuery);

  if (index === -1) {
    return cleanText.slice(0, 150);
  }

  const start = Math.max(index - 65, 0);
  const end = Math.min(index + cleanQuery.length + 90, cleanText.length);

  return `${start > 0 ? "..." : ""}${cleanText.slice(start, end)}${
    end < cleanText.length ? "..." : ""
  }`;
}

function HighlightedSnippet({
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

  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className={styles.match}>
        {text.slice(index, index + cleanQuery.length)}
      </mark>
      {text.slice(index + cleanQuery.length)}
    </>
  );
}

export default function WikiPage() {
  const [search, setSearch] = useState("");
  const [patchNotesSearch, setPatchNotesSearch] = useState<WikiSearchApiItem[]>(
    []
  );
  const [popularArticles, setPopularArticles] = useState<PopularArticle[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<LatestUpdate[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadLatestUpdates() {
      try {
        const response = await fetch("/api/changelog/latest", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (Array.isArray(data.posts)) {
          setLatestUpdates(data.posts);
        }
      } catch {
        setLatestUpdates([]);
      }
    }

    loadLatestUpdates();
  }, []);

  useEffect(() => {
    async function loadPopularArticles() {
      try {
        const response = await fetch("/api/articles/popular", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (Array.isArray(data.posts)) {
          setPopularArticles(data.posts);
        }
      } catch {
        setPopularArticles([]);
      }
    }

    loadPopularArticles();
  }, []);

  useEffect(() => {
    async function loadPatchNotesSearch() {
      try {
        const response = await fetch("/api/wiki/search", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (Array.isArray(data.items)) {
          setPatchNotesSearch(data.items);
        }
      } catch {
        setPatchNotesSearch([]);
      }
    }

    loadPatchNotesSearch();
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

  const searchResults = useMemo<SearchResultItem[]>(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    const wikiItems: SearchResultItem[] = articles.map((item) => {
      return {
        id: `wiki-${item.href}-${item.title}`,
        title: item.title,
        type: item.type,
        href: item.href,
        content: `${item.title} ${item.type} ${item.content}`,
        snippet: getSnippet(item.content, search),
      };
    });

    const dynamicItems: SearchResultItem[] = patchNotesSearch.map((item) => {
      const content = [
        item.title,
        item.description,
        item.category,
        item.searchText,
        item.type === "article" ? "Wiki статья гайд инструкция" : "Patch Note патч ноут Dev Blog обновление исправление",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        id: item.id,
        title: item.title,
        type: item.type === "article" ? `Wiki / ${item.category}` : "Dev Blog / Patch Note",
        href: item.href,
        content,
        snippet: getSnippet(content, search),
      };
    });

    return [...wikiItems, ...dynamicItems]
      .filter((item) => item.content.toLowerCase().includes(query))
      .slice(0, 12);
  }, [search, patchNotesSearch]);

  return (
    <main className={styles.page}>
      <StartGuideModal />

      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span>NOT LEGAL</span>
          <b>RP</b>
        </Link>

        <nav className={styles.nav}>
          <button type="button">Форум</button>

          <button type="button" className={styles.donateButton}>
            Пополнить
          </button>

          <Link href="/wiki" className={styles.active}>
            Wiki
          </Link>

          <Link href="/wiki/changelog">Dev Blog</Link>
          <Link href="/wiki/rules">Правила</Link>
        </nav>

        <WikiTopActions />
      </header>

      <section className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по Wiki и Patch Note..."
            />

            <kbd></kbd>
          </div>

          {search.trim() && (
            <div className={styles.searchResults}>
              <div className={styles.searchResultMeta}>
                <strong>Результаты поиска</strong>
                <span>Найдено: {searchResults.length}</span>
              </div>

              {searchResults.length > 0 ? (
                <div className={styles.searchResultList}>
                  {searchResults.map((item) => (
                    <Link
                      href={item.href}
                      className={styles.searchResultItem}
                      key={item.id}
                    >
                      <div>
                        <span className={styles.resultType}>{item.type}</span>
                        <h3>{item.title}</h3>

                        <p className={styles.resultText}>
                          <HighlightedSnippet
                            text={item.snippet}
                            query={search}
                          />
                        </p>
                      </div>

                      <strong>›</strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.noResults}>
                  По запросу ничего не найдено. Попробуй изменить текст поиска.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className={styles.heroImageBanner}>
        <img src="/wiki-hero-banner.png" alt="Wiki Not Legal RP" />
      </section>

      <section className={styles.categoryGrid}>
        {categories.map((item) => {
          if (item.type === "start") {
            return (
              <button
                type="button"
                className={styles.categoryCard}
                data-start-guide-trigger
                key={item.title}
              >
                <div className={styles.categoryIcon}>{item.icon}</div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>

                <strong>›</strong>
              </button>
            );
          }

          return (
            <Link
              href={item.href || "/wiki"}
              className={styles.categoryCard}
              key={item.title}
            >
              <div className={styles.categoryIcon}>{item.icon}</div>

              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>

              <strong>›</strong>
            </Link>
          );
        })}
      </section>

      <section className={styles.infoGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Популярные статьи</h2>
            <Link href="/wiki">Смотреть все ›</Link>
          </div>

          <div className={styles.articleList}>
            {popularArticles.length > 0 ? (
              popularArticles.map((item, index) => (
                <Link
                  href={item.href}
                  className={styles.articleItem}
                  key={item.id}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item.title}</p>
                  <b>◌ {formatViews(item.views)}</b>
                </Link>
              ))
            ) : (
              <div className={styles.emptyUpdates}>
                Популярные статьи пока не найдены.
              </div>
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Последние обновления</h2>
            <Link href="/wiki/changelog">Смотреть все ›</Link>
          </div>

          <div className={styles.updateList}>
            {latestUpdates.length > 0 ? (
              latestUpdates.map((item) => (
                <Link
                  href={`/wiki/changelog#${encodeURIComponent(item.id)}`}
                  className={styles.updateItem}
                  key={item.id}
                >
                  <span />
                  <p>{item.title}</p>
                  <b>{formatUpdateDate(item.publishedAt)}</b>
                </Link>
              ))
            ) : (
              <div className={styles.emptyUpdates}>
                Обновления пока не найдены.
              </div>
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Быстрые разделы</h2>
          </div>

          <div className={styles.quickList}>
            {quickSections.map((item) => (
              <Link href="/wiki" className={styles.quickItem} key={item}>
                <span>▧</span>
                <p>{item}</p>
                <b>›</b>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.popularSection}>
        <div className={styles.popularSectionHead}>
          <div>
            <span>ДИНАМИЧЕСКИЕ МАТЕРИАЛЫ</span>
            <h2>Популярные статьи Wiki</h2>
            <p>Материалы, созданные через админ-панель. Переход ведёт сразу к выбранному пункту статьи.</p>
          </div>

          <Link href="/admin/articles" className={styles.popularAdminLink}>
            Управление статьями →
          </Link>
        </div>

        <div className={styles.popularGrid}>
          {popularArticles.length > 0 ? (
            popularArticles.map((item, index) => (
              <Link className={styles.popularCard} href={item.href} key={item.id}>
                <div className={styles.popularCardTop}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item.featured ? "ЗАКРЕПЛЕНО" : item.category}</b>
                </div>

                <h3>{item.title}</h3>
                <p>{item.description || "Открыть статью и перейти к основному пункту."}</p>

                <div className={styles.popularCardMeta}>
                  <span>◉ {formatViews(item.views)}</span>
                  <span>{formatUpdateDate(item.updatedAt)} МСК</span>
                  <strong>Открыть ↗</strong>
                </div>
              </Link>
            ))
          ) : (
            <div className={styles.popularEmpty}>
              Опубликованные Wiki-статьи пока не найдены. Создайте первую страницу в /admin/articles.
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMark}>NL</div>

        <p>© 2024 Not Legal RP. Все права защищены.</p>

        <div className={styles.socials}>
          <button type="button">Discord</button>
          <button type="button">YouTube</button>
          <button type="button">ВКонтакте</button>
          <button type="button">Telegram</button>
        </div>

        <div className={styles.online}>
          <span />
          Онлайн: 523 / 1000
        </div>
      </footer>
    </main>
  );
}
