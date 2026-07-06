import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";
import {
  createLawDocument,
  deleteLawDocument,
  getLawDocuments,
  updateLawDocument,
  type LawDocumentInput,
} from "@/lib/laws-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user || !canOpenAdmin(user.role)) return null;
  return user;
}

function errorResponse(error: unknown, fallback: string) {
  console.error(fallback, error);
  return NextResponse.json(
    { message: error instanceof Error ? error.message : fallback },
    { status: 500 }
  );
}

function normalizePayload(body: Record<string, unknown>): LawDocumentInput {
  const title = String(body.title || "").trim();
  const contentHtml = String(body.contentHtml || "").trim();

  if (!title) throw new Error("Укажи название нормативного акта");
  if (!contentHtml || contentHtml === "<p></p>") {
    throw new Error("Добавь текст нормативного акта");
  }

  return {
    number: String(body.number || "").trim(),
    icon: String(body.icon || "§").trim() || "§",
    title,
    subtitle: String(body.subtitle || "").trim(),
    category: String(body.category || "Законы штата").trim() || "Законы штата",
    description: String(body.description || "").trim(),
    sortOrder: Number(body.sortOrder),
    version: String(body.version || "1.0").trim() || "1.0",
    adoptedAt: String(body.adoptedAt || "").trim(),
    published: body.published !== false,
    contentHtml,
  };
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ message: "Нет доступа" }, { status: 403 });

  try {
    return NextResponse.json({ documents: await getLawDocuments() });
  } catch (error) {
    return errorResponse(error, "Не удалось загрузить законодательство");
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ message: "Нет доступа" }, { status: 403 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const document = await createLawDocument(normalizePayload(body));
    return NextResponse.json({ document });
  } catch (error) {
    return errorResponse(error, "Ошибка создания нормативного акта");
  }
}

export async function PUT(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ message: "Нет доступа" }, { status: 403 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json(
        { message: "Не передан идентификатор документа" },
        { status: 400 }
      );
    }

    const document = await updateLawDocument(id, normalizePayload(body), {
      updateTimestamp: body.updateUpdatedAt !== false,
    });

    if (!document) {
      return NextResponse.json({ message: "Документ не найден" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    return errorResponse(error, "Ошибка обновления нормативного акта");
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ message: "Нет доступа" }, { status: 403 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const deleted = await deleteLawDocument(String(body.id || ""));

    if (!deleted) {
      return NextResponse.json({ message: "Документ не найден" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Ошибка удаления нормативного акта");
  }
}
