import { NextResponse } from "next/server";
import {
  getArticleHref,
  getPublishedArticles,
} from "@/lib/articles-store";
import { getAllPostViews } from "@/lib/post-views-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await getPublishedArticles();
  const views = await getAllPostViews();

  const popularArticles = articles
    .map((article) => ({
      id: article.id,
      title: article.title,
      description: article.description,
      category: article.category,
      href: getArticleHref(article),
      views: views[`wiki:${article.id}`] || 0,
      featured: article.featured,
      featuredOrder: article.featuredOrder || 999,
      updatedAt: article.updatedAt,
    }))
    .sort((a, b) => {
      if (a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }

      if (a.featured && b.featured && a.featuredOrder !== b.featuredOrder) {
        return a.featuredOrder - b.featuredOrder;
      }

      if (a.views !== b.views) {
        return b.views - a.views;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 8);

  return NextResponse.json({ posts: popularArticles });
}
