import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleRenderer from "@/components/article-renderer";
import ArticleViewTracker from "@/components/article-view-tracker";
import WikiArticleNavigation from "@/components/wiki-article-navigation";
import WikiArticleSaveButton from "@/components/wiki-article-save-button";
import {
  getArticleBySlug,
  getArticleHref,
  getPublishedArticles,
} from "@/lib/articles-store";
import {
  getArticleTableOfContents,
  type ArticleBlock,
  type ArticleTocItem,
} from "@/lib/article-types";
import { formatMoscowDate } from "@/lib/moscow-time";
import styles from "./article-page.module.css";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: string) {
  return formatMoscowDate(
    value,
    { day: "2-digit", month: "2-digit", year: "numeric" },
    "Дата не указана"
  );
}

function blocksWithLegacyImage(
  articleId: string,
  title: string,
  coverImage: string,
  coverPosition: string,
  blocks: ArticleBlock[]
) {
  const legacyImage = coverImage.trim();

  if (
    !legacyImage ||
    blocks.some((block) => block.type === "image" && block.imageUrl === legacyImage)
  ) {
    return blocks;
  }

  return [
    {
      id: `legacy-cover-${articleId}`,
      type: "image" as const,
      width: "wide" as const,
      align: "center" as const,
      surface: "none" as const,
      spaceTop: 10,
      spaceBottom: 18,
      imageUrl: legacyImage,
      imageAlt: title,
      imageHeight: 720,
      imageFit: "contain" as const,
      imagePosition: coverPosition || "50% 50%",
    },
    ...blocks,
  ];
}

function buildTocNumbers(toc: ArticleTocItem[]) {
  let section = 0;
  let subsection = 0;

  return toc.map((item) => {
    if (item.level === 2) {
      section += 1;
      subsection = 0;
      return String(section);
    }

    if (section === 0) {
      section = 1;
    }

    subsection += 1;
    return `${section}.${subsection}`;
  });
}

function normalizeCategory(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

export default async function WikiArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const articleBlocks = blocksWithLegacyImage(
    article.id,
    article.title,
    article.coverImage,
    article.coverPosition,
    article.blocks
  );
  const toc = getArticleTableOfContents(articleBlocks);
  const tocNumbers = buildTocNumbers(toc);
  const publishedArticles = await getPublishedArticles();
  const navigationArticles = publishedArticles.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    category: item.category,
    description: item.description,
    href: getArticleHref(item),
  }));

  const categoryArticles = publishedArticles.filter(
    (item) => normalizeCategory(item.category) === normalizeCategory(article.category)
  );
  const currentCategoryIndex = categoryArticles.findIndex(
    (item) => item.id === article.id
  );
  const previousArticle =
    currentCategoryIndex > 0 ? categoryArticles[currentCategoryIndex - 1] : null;
  const nextArticle =
    currentCategoryIndex >= 0 && currentCategoryIndex < categoryArticles.length - 1
      ? categoryArticles[currentCategoryIndex + 1]
      : null;
  const articleHref = `/wiki/${article.slug}`;

  return (
    <main className={styles.page}>
      <WikiArticleNavigation
        articles={navigationArticles}
        currentSlug={article.slug}
      />

      <div className={styles.pagePattern} aria-hidden="true" />

      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Навигация">
          <Link href="/wiki">Главная</Link>
          <span>/</span>
          <span>{article.category}</span>
          <span>/</span>
          <b>{article.title}</b>
        </nav>

        <header className={styles.articleHeader}>
          <div className={styles.articleTitleBlock}>
            <div className={styles.articleIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M5 4.75A2.75 2.75 0 0 1 7.75 2h8.5A2.75 2.75 0 0 1 19 4.75v14.5A2.75 2.75 0 0 1 16.25 22h-8.5A2.75 2.75 0 0 1 5 19.25V4.75Z" />
                <path d="M8.5 7h7M8.5 11h7M8.5 15h4.5" />
              </svg>
            </div>

            <div className={styles.titleText}>
              <h1>{article.title}</h1>
              {article.description && <p>{article.description}</p>}
            </div>
          </div>

          <div className={styles.articleTools} aria-label="Информация о статье">
            <div className={styles.articleToolTop}>
              <span className={styles.categoryBadge}>{article.category}</span>
              <WikiArticleSaveButton title={article.title} href={articleHref} />
            </div>

            <div className={styles.metaStats}>
              <span className={styles.metaChip} title="Просмотры">
                <ArticleViewTracker articleId={article.id} />
              </span>
              <span className={styles.metaChip} title="Дата создания">
                Создано {formatDate(article.createdAt)}
              </span>
              <span className={styles.metaChip} title="Последнее обновление">
                Обновлено {formatDate(article.updatedAt)} МСК
              </span>
              <span className={styles.metaChip} title="Разделы статьи">
                {toc.length} пунктов
              </span>
            </div>
          </div>
        </header>

        {article.showToc && toc.length > 0 && (
          <section className={styles.contentsCard} id="contents">
            <header>
              <div className={styles.contentsIcon} aria-hidden="true">☷</div>
              <h2>Содержание</h2>
              <b>{toc.length}</b>
            </header>

            <ol className={styles.contentsList}>
              {toc.map((item, index) => (
                <li
                  className={item.level === 3 ? styles.contentsChild : ""}
                  key={`${item.id}-${index}`}
                >
                  <a href={`#${item.id}`}>
                    <span>{tocNumbers[index]}</span>
                    <b>{item.label}</b>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <article className={styles.content} id="article-content">
          <ArticleRenderer blocks={articleBlocks} />
        </article>

        <footer className={styles.articleFooter}>
          <Link href="/wiki">← Вернуться в Wiki</Link>
          <span>Навигация по всем статьям открывается клавишей F10.</span>
          <kbd>F10</kbd>
        </footer>

        {(previousArticle || nextArticle) && (
          <nav className={styles.categoryNavigation} aria-label="Соседние статьи категории">
            {previousArticle && (
              <Link
                className={styles.previousArticle}
                href={`/wiki/${previousArticle.slug}`}
              >
                <span>← Предыдущая</span>
                <b>{previousArticle.title}</b>
                <small>{article.category}</small>
              </Link>
            )}

            {nextArticle && (
              <Link
                className={styles.nextArticle}
                href={`/wiki/${nextArticle.slug}`}
              >
                <span>Следующая →</span>
                <b>{nextArticle.title}</b>
                <small>{article.category}</small>
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
