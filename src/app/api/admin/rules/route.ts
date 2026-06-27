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

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const sections = await getRuleSections();

  return NextResponse.json({ sections });
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

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
}

export async function PUT(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

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
    return NextResponse.json({ message: "Раздел не найден" }, { status: 404 });
  }

  return NextResponse.json({ section });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const body = await request.json();
  const deleted = await deleteRuleSection(String(body.id));

  if (!deleted) {
    return NextResponse.json({ message: "Раздел не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}