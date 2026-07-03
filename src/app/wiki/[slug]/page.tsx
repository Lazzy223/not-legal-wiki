import Link from "next/link";
import { notFound } from "next/navigation";
import WikiContent from "@/components/wiki-content";
import { getArticleBySlug } from "@/lib/articles-store";
import styles from "./article-page.module.css";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(value: string) {
  if (!value) {
    return "Дата не указана";
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

function prepareHtmlContent(value: string) {
  if (!value) {
    return "<p>В этой статье пока нет содержимого.</p>";
  }

  if (value.includes("<p") || value.includes("<h") || value.includes("<ul")) {
    return value;
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${item}</p>`)
    .join("");
}

export default async function WikiArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/wiki" className={styles.logo}>
          <span>NLRP</span>
          WIKI
        </Link>

        <nav className={styles.nav}>
          <Link href="/">Главная</Link>
          <Link href="/wiki">Wiki</Link>
          <Link href="/wiki/rules">Правила</Link>
          <Link href="/wiki/changelog">Dev Blog</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.badge}>{article.category}</div>

        <h1>{article.title}</h1>

        {article.description && <p>{article.description}</p>}

        <div className={styles.meta}>
          <span>Создано: {formatDate(article.createdAt)}</span>
          <span>Обновлено: {formatDate(article.updatedAt)}</span>
          <span>/wiki/{article.slug}</span>
        </div>
      </section>

      <section className={styles.content}>
        <WikiContent html={prepareHtmlContent(article.content)} />
      </section>

      <div className={styles.bottomActions}>
        <Link href="/wiki" className={styles.backButton}>
          ← Вернуться в Wiki
        </Link>
      </div>
    </main>
  );
}