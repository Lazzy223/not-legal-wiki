import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, verifySession } from "@/lib/auth";
import { changeOwnerPassword } from "@/lib/owner-store";
import { changeManagedUserPassword } from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user) {
    return NextResponse.json(
      { message: "Сессия не найдена" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword.trim() || !newPassword.trim()) {
      return NextResponse.json(
        { message: "Заполни текущий и новый пароль" },
        { status: 400 }
      );
    }

    if (user.role === "owner" || user.username.toLowerCase() === "owner") {
      await changeOwnerPassword(currentPassword, newPassword);
    } else {
      await changeManagedUserPassword(
        user.username,
        currentPassword,
        newPassword
      );
    }

    return NextResponse.json({
      success: true,
      message: "Пароль успешно изменён",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Не удалось изменить пароль",
      },
      { status: 400 }
    );
  }
}
