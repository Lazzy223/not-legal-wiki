import { NextResponse } from "next/server";
import { getChangelogPosts } from "@/lib/changelog-store";
import {
  getArticleHref,
  getArticlePlainText,
  getPublishedArticles,
} from "@/lib/articles-store";

export const dynamic = "force-dynamic";

type ChangelogPostSearch = {
  description?: string;
};

function stripHtml(value = "") {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(li|p|div|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getDescription(post: ChangelogPostSearch, fallback = "") {
  if (post.description?.trim()) {
    return post.description.trim();
  }

  return fallback.slice(0, 180);
}

export async function GET() {
  const [posts, articles] = await Promise.all([
    getChangelogPosts(),
    getPublishedArticles(),
  ]);

  const changelogItems = posts.map((post) => {
    const typedPost = post as typeof post & ChangelogPostSearch;
    const updatesText = [
      ...(post.updates || []),
      stripHtml(post.updatesHtml),
    ]
      .filter(Boolean)
      .join(" ");
    const fixesText = [
      ...(post.fixes || []),
      stripHtml(post.fixesHtml),
    ]
      .filter(Boolean)
      .join(" ");
    const fullText = [
      post.title,
      typedPost.description,
      post.publishedAt,
      updatesText,
      fixesText,
      "patch note",
      "патч ноут",
      "dev blog",
      "обновление",
      "исправление",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: `patch-${post.id}`,
      type: "patch-note" as const,
      title: post.title,
      description: getDescription(typedPost, updatesText || fixesText),
      href: `/wiki/changelog#${encodeURIComponent(post.id)}`,
      category: "Patch Note",
      searchText: fullText,
      date: post.publishedAt,
    };
  });

  const articleItems = articles.map((article) => ({
    id: `article-${article.id}`,
    type: "article" as const,
    title: article.title,
    description: article.description,
    href: getArticleHref(article),
    category: article.category,
    searchText: getArticlePlainText(article),
    date: article.updatedAt,
  }));

  return NextResponse.json({
    items: [...articleItems, ...changelogItems],
  });
}
