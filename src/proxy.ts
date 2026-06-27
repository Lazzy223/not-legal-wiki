import { NextRequest, NextResponse } from "next/server";
import { authCookieName, canOpenAdmin, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(authCookieName)?.value;
  const user = await verifySession(token);

  if (!user || !canOpenAdmin(user.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};