import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, isOwner, verifySession } from "@/lib/auth";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUsers,
  updateManagedUser,
} from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwner() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user || !isOwner(user.role)) {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await requireOwner();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  const users = await getManagedUsers();

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await requireOwner();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const createdUser = await createManagedUser({
      username: String(body.username || ""),
      password: String(body.password || ""),
    });

    return NextResponse.json({ user: createdUser });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Ошибка создания пользователя",
      },
      {
        status: 400,
      }
    );
  }
}

export async function PUT(request: Request) {
  const user = await requireOwner();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const updatedUser = await updateManagedUser(String(body.id || ""), {
      username: String(body.username || ""),
      password: String(body.password || ""),
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Ошибка обновления пользователя",
      },
      {
        status: 400,
      }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireOwner();

  if (!user) {
    return NextResponse.json({ message: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await request.json();

    await deleteManagedUser(String(body.id || ""));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Ошибка удаления пользователя",
      },
      {
        status: 400,
      }
    );
  }
}