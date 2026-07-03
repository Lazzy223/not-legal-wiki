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

function errorResponse(error: unknown, fallback: string) {
  console.error(fallback, error);

  return NextResponse.json(
    {
      message: error instanceof Error ? error.message : fallback,
    },
    { status: 500 }
  );
}

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const posts = await getChangelogPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    return errorResponse(error, "Не удалось загрузить публикации");
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const post = await createChangelogPost({
      title: body.title,
      description: body.description,
      publishedAt: body.publishedAt,
      updates: body.updates,
      fixes: body.fixes,
      updatesHtml: body.updatesHtml,
      fixesHtml: body.fixesHtml,
    });

    return NextResponse.json({ post });
  } catch (error) {
    return errorResponse(error, "Ошибка сохранения публикации");
  }
}

export async function PUT(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const post = await updateChangelogPost(String(body.id), {
      title: body.title,
      description: body.description,
      publishedAt: body.publishedAt,
      updates: body.updates,
      fixes: body.fixes,
      updatesHtml: body.updatesHtml,
      fixesHtml: body.fixesHtml,
    });

    if (!post) {
      return NextResponse.json(
        { message: "Пост не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    return errorResponse(error, "Ошибка обновления публикации");
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const deleted = await deleteChangelogPost(String(body.id));

    if (!deleted) {
      return NextResponse.json(
        { message: "Пост не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Ошибка удаления публикации");
  }
}
