import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  content: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), "src", "data", "articles-db.json");

async function ensureFile() {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf-8");
  }
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9а-яё_-]/gi, "")
    .replace(/-+/g, "-");
}

function normalizeArticle(article: Partial<WikiArticle>): WikiArticle {
  const now = new Date().toISOString();

  return {
    id: String(article.id || randomUUID()),
    slug: normalizeSlug(String(article.slug || article.title || "article")),
    title: String(article.title || "Без названия").trim(),
    category: String(article.category || "general").trim(),
    description: String(article.description || "").trim(),
    content: String(article.content || "").trim(),
    published: Boolean(article.published),
    sortOrder:
      typeof article.sortOrder === "number"
        ? article.sortOrder
        : Number(article.sortOrder || 999),
    createdAt: String(article.createdAt || now),
    updatedAt: String(article.updatedAt || now),
  };
}

function sortArticles(articles: WikiArticle[]) {
  return articles.sort((a, b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function getArticles(): Promise<WikiArticle[]> {
  await ensureFile();

  const file = await fs.readFile(filePath, "utf-8");
  const rawArticles = JSON.parse(file) as Partial<WikiArticle>[];

  const articles = rawArticles.map(normalizeArticle);

  return sortArticles(articles);
}

export async function getPublishedArticles() {
  const articles = await getArticles();

  return articles.filter((article) => article.published);
}

export async function getArticleBySlug(slug: string) {
  const articles = await getArticles();

  return (
    articles.find(
      (article) => article.slug === slug && article.published
    ) || null
  );
}

async function saveArticles(articles: WikiArticle[]) {
  await ensureFile();

  await fs.writeFile(filePath, JSON.stringify(articles, null, 2), "utf-8");
}

export async function createArticle(data: {
  slug: string;
  title: string;
  category: string;
  description: string;
  content: string;
  published: boolean;
  sortOrder: number;
}) {
  const articles = await getArticles();
  const now = new Date().toISOString();

  const article: WikiArticle = {
    id: randomUUID(),
    slug: normalizeSlug(data.slug || data.title),
    title: String(data.title || "Без названия").trim(),
    category: String(data.category || "general").trim(),
    description: String(data.description || "").trim(),
    content: String(data.content || "").trim(),
    published: Boolean(data.published),
    sortOrder: Number(data.sortOrder || 999),
    createdAt: now,
    updatedAt: now,
  };

  articles.push(article);

  await saveArticles(sortArticles(articles));

  return article;
}

export async function updateArticle(
  id: string,
  data: {
    slug: string;
    title: string;
    category: string;
    description: string;
    content: string;
    published: boolean;
    sortOrder: number;
  }
) {
  const articles = await getArticles();
  const index = articles.findIndex((article) => article.id === id);

  if (index === -1) {
    return null;
  }

  articles[index] = {
    ...articles[index],
    slug: normalizeSlug(data.slug || data.title),
    title: String(data.title || "Без названия").trim(),
    category: String(data.category || "general").trim(),
    description: String(data.description || "").trim(),
    content: String(data.content || "").trim(),
    published: Boolean(data.published),
    sortOrder: Number(data.sortOrder || 999),
    updatedAt: new Date().toISOString(),
  };

  await saveArticles(sortArticles(articles));

  return articles[index];
}

export async function deleteArticle(id: string) {
  const articles = await getArticles();
  const filteredArticles = articles.filter((article) => article.id !== id);

  if (filteredArticles.length === articles.length) {
    return false;
  }

  await saveArticles(filteredArticles);

  return true;
}