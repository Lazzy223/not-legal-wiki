import { NextResponse } from "next/server";
import { getChangelogPosts } from "@/lib/changelog-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getChangelogPosts();

  return NextResponse.json({
    posts: posts.slice(0, 4).map((post) => ({
      id: post.id,
      title: post.title,
      publishedAt: post.publishedAt,
    })),
  });
}