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
    const body = await request.json();

    const section = await createRuleSection({
      number: body.number,
      icon: body.icon,
      title: body.title,
      short: body.short,
      description: body.description,
      sortOrder: Number(body.sortOrder || 999),
      contentHtml: body.contentHtml,
      blocks: [],
    });

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
    const body = await request.json();

    const section = await updateRuleSection(String(body.id), {
      number: body.number,
      icon: body.icon,
      title: body.title,
      short: body.short,
      description: body.description,
      sortOrder: Number(body.sortOrder || 999),
      contentHtml: body.contentHtml,
      blocks: [],
    });

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
    const body = await request.json();
    const deleted = await deleteRuleSection(String(body.id));

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
