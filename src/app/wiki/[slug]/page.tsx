import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleRenderer from "@/components/article-renderer";
import ArticleViewTracker from "@/components/article-view-tracker";
import {
  getArticleBySlug,
  getArticleHref,
  getPublishedArticles,
} from "@/lib/articles-store";
import { getArticleTableOfContents } from "@/lib/article-types";
import { formatMoscowDate } from "@/lib/moscow-time";
import styles from "./article-page.module.css";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: string) {
  return formatMoscowDate(
    value,
    { day: "2-digit", month: "long", year: "numeric" },
    "Дата не указана"
  );
}

export default async function WikiArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const toc = getArticleTableOfContents(article.blocks);
  const related = (await getPublishedArticles())
    .filter(
      (item) => item.id !== article.id && item.category === article.category
    )
    .slice(0, 4);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/wiki" className={styles.logo}>
          <span>NOT LEGAL</span>
          <b>RP</b>
          <i>/ WIKI</i>
        </Link>

        <nav className={styles.nav}>
          <Link href="/">Главная</Link>
          <Link href="/wiki">Wiki</Link>
          <Link href="/wiki/rules">Правила</Link>
          <Link href="/wiki/changelog">Dev Blog</Link>
        </nav>
      </header>

      <section
        className={`${styles.hero} ${article.coverImage ? styles.heroWithImage : ""}`}
        style={
          article.coverImage
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(4,5,7,.96), rgba(4,5,7,.58), rgba(4,5,7,.92)), url("${article.coverImage}")`,
                backgroundPosition: article.coverPosition || "50% 50%",
              }
            : undefined
        }
      >
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.breadcrumbs}>
            <Link href="/wiki">Wiki</Link>
            <span>/</span>
            <span>{article.category}</span>
          </div>

          <div className={styles.badge}>{article.category}</div>
          <h1>{article.title}</h1>
          {article.description && <p>{article.description}</p>}

          <div className={styles.meta}>
            <span>Обновлено: {formatDate(article.updatedAt)} МСК</span>
            <span>{toc.length} пунктов</span>
            <ArticleViewTracker articleId={article.id} />
          </div>
        </div>
      </section>

      {article.showToc && toc.length > 0 && (
        <section className={styles.contentsCard}>
          <header>
            <div className={styles.contentsIcon}>☷</div>
            <div>
              <span>БЫСТРАЯ НАВИГАЦИЯ</span>
              <h2>Содержание</h2>
            </div>
            <b>{toc.length}</b>
          </header>

          <div className={styles.contentsGrid}>
            {toc.map((item, index) => (
              <a
                className={item.level === 3 ? styles.contentsChild : ""}
                href={`#${item.id}`}
                key={`${item.id}-${index}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{item.label}</b>
                <i>↓</i>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className={styles.articleLayout} id="article-start">
        {article.showToc && toc.length > 0 && (
          <aside className={styles.stickyNavigation}>
            <span>НА ЭТОЙ СТРАНИЦЕ</span>
            <nav>
              {toc.map((item, index) => (
                <a
                  className={item.level === 3 ? styles.stickyChild : ""}
                  href={`#${item.id}`}
                  key={`${item.id}-sticky-${index}`}
                >
                  <i />
                  {item.label}
                </a>
              ))}
            </nav>
            <a className={styles.toTop} href="#article-start">
              ↑ К началу статьи
            </a>
          </aside>
        )}

        <article className={styles.content}>
          <ArticleRenderer blocks={article.blocks} />
        </article>
      </section>

      {related.length > 0 && (
        <section className={styles.relatedSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>ПРОДОЛЖИТЬ ЧТЕНИЕ</span>
              <h2>Похожие статьи</h2>
            </div>
            <Link href="/wiki">Все материалы →</Link>
          </div>

          <div className={styles.relatedGrid}>
            {related.map((item, index) => (
              <Link className={styles.relatedCard} href={getArticleHref(item)} key={item.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>{item.category}</small>
                  <h3>{item.title}</h3>
                  <p>{item.description || "Открыть материал Wiki"}</p>
                </div>
                <b>↗</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.bottomActions}>
        <Link href="/wiki" className={styles.backButton}>
          ← Вернуться в Wiki
        </Link>
      </div>
    </main>
  );
}
