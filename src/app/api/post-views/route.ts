import { NextRequest, NextResponse } from "next/server";
import {
  getAllPostViews,
  getPostViews,
  incrementPostViews,
} from "@/lib/post-views-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("postId");

  if (postId) {
    const views = await getPostViews(postId);

    return NextResponse.json({
      postId,
      views,
    });
  }

  const views = await getAllPostViews();

  return NextResponse.json({
    views,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const postId = body?.postId;

  if (!postId || typeof postId !== "string") {
    return NextResponse.json(
      { message: "postId is required" },
      { status: 400 }
    );
  }

  const views = await incrementPostViews(postId);

  return NextResponse.json({
    postId,
    views,
  });
}