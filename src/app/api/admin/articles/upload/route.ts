import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user || !canOpenAdmin(user.role)) {
    return null;
  }

  return user;
}

function safeFileName(value: string) {
  const extension = path.extname(value).toLowerCase();
  const base = path
    .basename(value, extension)
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-z0-9а-я_-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return `${base || "image"}${extension || ".webp"}`;
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Выберите изображение" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Разрешены JPG, PNG, WEBP и GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Размер изображения не должен превышать 4 МБ" },
        { status: 400 }
      );
    }

    const filename = `${Date.now()}-${safeFileName(file.name)}`;

    if (process.env.VERCEL) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          {
            message:
              "Vercel Blob не подключён. Добавьте Blob Storage к проекту и выполните новый деплой.",
          },
          { status: 503 }
        );
      }

      const blob = await put(`wiki/${filename}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      return NextResponse.json({
        url: blob.url,
        pathname: blob.pathname,
      });
    }

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "wiki"
    );
    await mkdir(uploadDirectory, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDirectory, filename), bytes);

    return NextResponse.json({
      url: `/uploads/wiki/${filename}`,
      pathname: `uploads/wiki/${filename}`,
    });
  } catch (error) {
    console.error("Article image upload failed", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить изображение",
      },
      { status: 500 }
    );
  }
}
