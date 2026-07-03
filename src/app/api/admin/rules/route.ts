import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";
import {
  createRuleSection,
  deleteRuleSection,
  getRuleSections,
  updateRuleSection,
} from "@/lib/rules-store";

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

function normalizePayload(body: Record<string, unknown>) {
  const title = String(body.title || "").trim();
  const contentHtml = String(body.contentHtml || "").trim();

  if (!title) {
    throw new Error("Укажи название раздела правил");
  }

  if (!contentHtml || contentHtml === "<p></p>") {
    throw new Error("Добавь текст правил");
  }

  return {
    number: String(body.number || "").trim(),
    icon: String(body.icon || "📜").trim() || "📜",
    title,
    short: String(body.short || "").trim(),
    description: String(body.description || "").trim(),
    sortOrder: Number(body.sortOrder),
    version: String(body.version || "1.0").trim() || "1.0",
    contentHtml,
    blocks: [],
  };
}

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const sections = await getRuleSections();
    return NextResponse.json({ sections });
  } catch (error) {
    return errorResponse(error, "Не удалось загрузить правила");
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const section = await createRuleSection(normalizePayload(body));

    return NextResponse.json({ section });
  } catch (error) {
    return errorResponse(error, "Ошибка сохранения раздела правил");
  }
}

export async function PUT(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json(
        { message: "Не передан идентификатор раздела" },
        { status: 400 }
      );
    }

    const section = await updateRuleSection(id, normalizePayload(body));

    if (!section) {
      return NextResponse.json(
        { message: "Раздел не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ section });
  } catch (error) {
    return errorResponse(error, "Ошибка обновления раздела правил");
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const deleted = await deleteRuleSection(String(body.id || ""));

    if (!deleted) {
      return NextResponse.json(
        { message: "Раздел не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Ошибка удаления раздела правил");
  }
}
