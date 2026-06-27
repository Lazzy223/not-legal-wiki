import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";
import {
  createArticle,
  deleteArticle,
  getArticles,
  updateArticle,
} from "@/lib/articles-store";

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

  const articles = await getArticles();

  return NextResponse.json({ articles });
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();

  const article = await createArticle({
    slug: body.slug,
    title: body.title,
    category: body.category,
    description: body.description,
    content: body.content,
    published: body.published,
    sortOrder: Number(body.sortOrder || 999),
  });

  return NextResponse.json({ article });
}

export async function PUT(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();

  const article = await updateArticle(String(body.id), {
    slug: body.slug,
    title: body.title,
    category: body.category,
    description: body.description,
    content: body.content,
    published: body.published,
    sortOrder: Number(body.sortOrder || 999),
  });

  if (!article) {
    return NextResponse.json({ message: "Статья не найдена" }, { status: 404 });
  }

  return NextResponse.json({ article });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();
  const deleted = await deleteArticle(String(body.id));

  if (!deleted) {
    return NextResponse.json({ message: "Статья не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}