import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user) {
    return NextResponse.json({
      user: null,
    });
  }

  return NextResponse.json({
    user: {
      login: user.username,
      username: user.username,
      role: user.role,
      roleId: user.roleId,
      roleName: user.roleName,
      canOpenAdmin: user.canOpenAdmin,
      canManageUsers: user.canManageUsers,
    },
  });
}
