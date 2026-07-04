import { NextResponse } from "next/server";
import {
  getArticleHref,
  getPublishedArticles,
} from "@/lib/articles-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const articles = await getPublishedArticles();
  const filteredArticles = category
    ? articles.filter((article) => article.category === category)
    : articles;

  return NextResponse.json({
    articles: filteredArticles.map((article) => ({
      id: article.id,
      slug: article.slug,
      href: getArticleHref(article),
      title: article.title,
      category: article.category,
      description: article.description,
      coverImage: article.coverImage,
      sortOrder: article.sortOrder,
      updatedAt: article.updatedAt,
    })),
  });
}
