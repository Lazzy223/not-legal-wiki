import { NextResponse } from "next/server";
import { getChangelogPosts } from "@/lib/changelog-store";
import { getAllPostViews } from "@/lib/post-views-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getChangelogPosts();
  const views = await getAllPostViews();

  const popularPosts = posts
    .map((post) => ({
      id: post.id,
      title: post.title,
      href: `/wiki/changelog#${encodeURIComponent(post.id)}`,
      views: views[post.id] || 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return NextResponse.json({
    posts: popularPosts,
  });
}