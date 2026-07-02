import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieName, canOpenAdmin, getRoleName, verifySession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  const user = await verifySession(token);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      login: user.login,
      role: user.role,
      roleName: getRoleName(user.role),
      canOpenAdmin: canOpenAdmin(user.role),
    },
  });
}