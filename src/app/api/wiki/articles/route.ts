import { NextResponse } from "next/server";
import { getPublishedArticles } from "@/lib/articles-store";

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
      title: article.title,
      category: article.category,
      description: article.description,
      sortOrder: article.sortOrder,
      updatedAt: article.updatedAt,
    })),
  });
}