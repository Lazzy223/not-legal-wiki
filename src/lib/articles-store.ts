import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJsonStore, writeJsonStore } from "@/lib/persistent-json-store";
import {
  createArticleBlock,
  getArticlePrimaryAnchor,
  getArticleSearchText,
  normalizeArticleBlocks,
  type ArticleBlock,
} from "@/lib/article-types";

export type { ArticleBlock } from "@/lib/article-types";

export type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  content: string;
  blocks: ArticleBlock[];
  coverImage: string;
  coverPosition: string;
  showToc: boolean;
  featured: boolean;
  featuredOrder: number;
  featuredAnchor: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type WikiArticleInput = {
  slug: string;
  title: string;
  category: string;
  description: string;
  content?: string;
  blocks?: ArticleBlock[];
  coverImage?: string;
  coverPosition?: string;
  showToc?: boolean;
  featured?: boolean;
  featuredOrder?: number;
  featuredAnchor?: string;
  published: boolean;
  sortOrder: number;
};

const filePath = path.join(process.cwd(), "src", "data", "articles-db.json");

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("ё", "е")
    .replace(/[^a-z0-9а-я_-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function legacyContentToBlocks(content: string) {
  if (!content.trim()) {
    return [createArticleBlock("heading"), createArticleBlock("text")];
  }

  return [
    {
      ...createArticleBlock("text"),
      id: `legacy-${randomUUID()}`,
      html: content,
    },
  ];
}

function normalizeArticle(article: Partial<WikiArticle>): WikiArticle {
  const now = new Date().toISOString();
  const content = String(article.content || "").trim();
  const normalizedBlocks = normalizeArticleBlocks(article.blocks);
  const blocks =
    normalizedBlocks.length > 0 ? normalizedBlocks : legacyContentToBlocks(content);

  return {
    id: String(article.id || randomUUID()),
    slug: normalizeSlug(String(article.slug || article.title || "article")),
    title: String(article.title || "Без названия").trim(),
    category: String(article.category || "general").trim(),
    description: String(article.description || "").trim(),
    content,
    blocks,
    coverImage: String(article.coverImage || "").trim(),
    coverPosition: String(article.coverPosition || "50% 50%").trim(),
    showToc: article.showToc !== false,
    featured: Boolean(article.featured),
    featuredOrder: Number(article.featuredOrder || 999),
    featuredAnchor: String(article.featuredAnchor || "").trim(),
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
  const rawArticles = await readJsonStore<Partial<WikiArticle>[]>({
    key: "articles",
    filePath,
    fallback: [],
  });

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
    articles.find((article) => article.slug === slug && article.published) || null
  );
}

export function getArticleHref(article: WikiArticle) {
  const anchor = getArticlePrimaryAnchor(
    article.blocks,
    article.featuredAnchor
  );

  return `/wiki/${article.slug}#${encodeURIComponent(anchor)}`;
}

export function getArticlePlainText(article: WikiArticle) {
  return [
    article.title,
    article.category,
    article.description,
    getArticleSearchText(article.blocks),
    article.content,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function saveArticles(articles: WikiArticle[]) {
  await writeJsonStore({ key: "articles", filePath }, articles);
}

function normalizeInput(data: WikiArticleInput) {
  const normalizedBlocks = normalizeArticleBlocks(data.blocks);
  const blocks =
    normalizedBlocks.length > 0
      ? normalizedBlocks
      : legacyContentToBlocks(String(data.content || ""));

  return {
    slug: normalizeSlug(data.slug || data.title),
    title: String(data.title || "Без названия").trim(),
    category: String(data.category || "general").trim(),
    description: String(data.description || "").trim(),
    content: String(data.content || "").trim(),
    blocks,
    coverImage: String(data.coverImage || "").trim(),
    coverPosition: String(data.coverPosition || "50% 50%").trim(),
    showToc: data.showToc !== false,
    featured: Boolean(data.featured),
    featuredOrder: Number(data.featuredOrder || 999),
    featuredAnchor: String(data.featuredAnchor || "").trim(),
    published: Boolean(data.published),
    sortOrder: Number(data.sortOrder || 999),
  };
}

export async function createArticle(data: WikiArticleInput) {
  const articles = await getArticles();
  const now = new Date().toISOString();
  const normalized = normalizeInput(data);

  const duplicateSlug = articles.some(
    (article) => article.slug === normalized.slug
  );

  if (duplicateSlug) {
    throw new Error("Статья с таким slug уже существует");
  }

  const article: WikiArticle = {
    id: randomUUID(),
    ...normalized,
    createdAt: now,
    updatedAt: now,
  };

  articles.push(article);

  await saveArticles(sortArticles(articles));

  return article;
}

export async function updateArticle(id: string, data: WikiArticleInput) {
  const articles = await getArticles();
  const index = articles.findIndex((article) => article.id === id);

  if (index === -1) {
    return null;
  }

  const normalized = normalizeInput(data);
  const duplicateSlug = articles.some(
    (article) => article.id !== id && article.slug === normalized.slug
  );

  if (duplicateSlug) {
    throw new Error("Статья с таким slug уже существует");
  }

  articles[index] = {
    ...articles[index],
    ...normalized,
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
