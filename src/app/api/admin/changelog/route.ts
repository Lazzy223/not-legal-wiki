import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";
import {
  createChangelogPost,
  deleteChangelogPost,
  getChangelogPosts,
  updateChangelogPost,
} from "@/lib/changelog-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user || !canOpenAdmin(user.role)) {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const posts = await getChangelogPosts();

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();

  const post = await createChangelogPost({
    title: body.title,
    publishedAt: body.publishedAt,
    updates: body.updates,
    fixes: body.fixes,
    updatesHtml: body.updatesHtml,
    fixesHtml: body.fixesHtml,
  });

  return NextResponse.json({ post });
}

export async function PUT(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();

  const post = await updateChangelogPost(String(body.id), {
    title: body.title,
    publishedAt: body.publishedAt,
    updates: body.updates,
    fixes: body.fixes,
    updatesHtml: body.updatesHtml,
    fixesHtml: body.fixesHtml,
  });

  if (!post) {
    return NextResponse.json({ message: "Пост не найден" }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();
  const deleted = await deleteChangelogPost(String(body.id));

  if (!deleted) {
    return NextResponse.json({ message: "Пост не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}