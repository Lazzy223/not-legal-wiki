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

function getStorageState() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
  const isVercel = Boolean(process.env.VERCEL);
  const useBlob = isVercel || Boolean(blobToken);

  if (useBlob) {
    return {
      ready: Boolean(blobToken),
      storage: "vercel-blob" as const,
      blobToken,
      message: blobToken
        ? "Vercel Blob подключён. Фото будут храниться постоянно и доступны после деплоя."
        : "Vercel Blob не подключён: отсутствует BLOB_READ_WRITE_TOKEN.",
    };
  }

  return {
    ready: true,
    storage: "local" as const,
    blobToken: "",
    message:
      "Локальный режим: фото сохраняются в public/uploads/wiki. На Vercel требуется Blob Storage.",
  };
}

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const storage = getStorageState();

  return NextResponse.json({
    ready: storage.ready,
    storage: storage.storage,
    message: storage.message,
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: Array.from(ALLOWED_TYPES),
  });
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

    if (file.size === 0) {
      return NextResponse.json(
        { message: "Выбранный файл пустой" },
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
    const storage = getStorageState();

    if (storage.storage === "vercel-blob") {
      if (!storage.ready || !storage.blobToken) {
        return NextResponse.json(
          {
            message:
              "Vercel Blob не подключён. Создайте публичное Blob-хранилище, добавьте BLOB_READ_WRITE_TOKEN для Production и выполните новый деплой.",
          },
          { status: 503 }
        );
      }

      const blob = await put(`wiki/${filename}`, file, {
        access: "public",
        addRandomSuffix: true,
        token: storage.blobToken,
      });

      if (!blob.url || !blob.pathname) {
        throw new Error("Vercel Blob не вернул адрес загруженного файла");
      }

      return NextResponse.json({
        url: blob.url,
        pathname: blob.pathname,
        storage: storage.storage,
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
      storage: storage.storage,
    });
  } catch (error) {
    console.error("Article image upload failed", error);

    const rawMessage =
      error instanceof Error ? error.message : "Не удалось загрузить изображение";
    const message = /private|access/i.test(rawMessage)
      ? "Для изображений статей нужно публичное Vercel Blob-хранилище. Проверьте тип доступа хранилища."
      : /token|unauthorized|forbidden/i.test(rawMessage)
        ? "Токен Vercel Blob недействителен или не подключён к текущему окружению."
        : rawMessage;

    return NextResponse.json({ message }, { status: 500 });
  }
}
