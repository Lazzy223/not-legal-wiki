import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authCookieName, verifySession } from "@/lib/auth";
import {
  createManagedRole,
  deleteManagedRole,
  getManagedRoles,
  updateManagedRole,
} from "@/lib/roles-store";
import { getManagedUsers } from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireRoleManager() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user?.canManageUsers) {
    return null;
  }

  return user;
}

export async function GET() {
  const currentUser = await requireRoleManager();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Нет доступа" },
      { status: 403 }
    );
  }

  const roles = await getManagedRoles();

  return NextResponse.json({
    roles: [
      {
        id: "owner",
        name: "Owner",
        slug: "owner",
        color: "#ef4444",
        permissions: {
          canOpenAdmin: true,
          canManageUsers: true,
        },
        isSystem: true,
        assignable: false,
        createdAt: "",
        updatedAt: "",
      },
      ...roles.map((role) => ({
        ...role,
        assignable: true,
      })),
    ],
  });
}

export async function POST(request: NextRequest) {
  const currentUser = await requireRoleManager();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Нет доступа" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const role = await createManagedRole({
      name: String(body?.name || ""),
      slug: String(body?.slug || ""),
      color: String(body?.color || ""),
      permissions: body?.permissions,
    });

    return NextResponse.json({ role });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания роли",
      },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const currentUser = await requireRoleManager();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Нет доступа" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const role = await updateManagedRole(String(body?.id || ""), {
      name: String(body?.name || ""),
      slug: String(body?.slug || ""),
      color: String(body?.color || ""),
      permissions: body?.permissions,
    });

    return NextResponse.json({ role });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Ошибка обновления роли",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = await requireRoleManager();

  if (!currentUser) {
    return NextResponse.json(
      { message: "Нет доступа" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const users = await getManagedUsers();

    if (users.some((user) => user.roleId === id)) {
      throw new Error(
        "Сначала назначь пользователям другую роль"
      );
    }

    await deleteManagedRole(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Ошибка удаления роли",
      },
      { status: 400 }
    );
  }
}
